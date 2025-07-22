import os
import uuid
import tempfile
from concurrent.futures import ThreadPoolExecutor
from django.conf import settings
from django.http import JsonResponse
from rest_framework import status, viewsets, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .services import DICOMParser, DICOMTransferService
from .models import TransferLog
from .serializers import TransferLogSerializer, TransferLogListSerializer

# Global dictionary to store series file mappings (in production, use Redis or database)
SERIES_FILE_CACHE = {}

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_dicom_files(request):
    """
    Import DICOM files from uploaded form data.
    Parse metadata and group by patient/series.
    """
    try:
        # Check if files were uploaded
        if 'files' not in request.FILES:
            return Response({
                'error': 'No files uploaded'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        files = request.FILES.getlist('files')
        if not files:
            return Response({
                'error': 'No files provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create temporary directory for this import session
        temp_dir = tempfile.mkdtemp(prefix='dicom_import_')
        session_id = str(uuid.uuid4())
        
        # Initialize DICOM parser
        parser = DICOMParser()
        
        # Process each uploaded file
        processed_files = []
        errors = []
        
        for uploaded_file in files:
            try:
                # Save file to temporary location
                file_path = os.path.join(temp_dir, uploaded_file.name)
                
                # Ensure directory exists
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                
                with open(file_path, 'wb+') as destination:
                    for chunk in uploaded_file.chunks():
                        destination.write(chunk)
                
                # Parse DICOM metadata
                metadata = parser.parse_file(file_path)
                if metadata:
                    metadata['file_path'] = file_path
                    processed_files.append(metadata)
                else:
                    errors.append(f"Failed to parse DICOM file: {uploaded_file.name}")
                    
            except Exception as e:
                errors.append(f"Error processing {uploaded_file.name}: {str(e)}")
        
        if not processed_files:
            return Response({
                'error': 'No valid DICOM files found',
                'errors': errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Group files by patient and series
        patients_data = parser.group_by_patient_and_series(processed_files)
        
        # Store file mappings for later transfer
        for patient in patients_data:
            for series in patient['series']:
                series_key = f"{session_id}_{series['id']}"
                SERIES_FILE_CACHE[series_key] = {
                    'files': series.get('files', []),
                    'user_id': request.user.id,
                    'session_id': session_id
                }
                # Update series ID to include session for frontend
                series['id'] = series_key
        
        # Log the import action
        TransferLog.objects.create(
            user=request.user,
            action='import',
            status='success',
            details={
                'files_processed': len(processed_files),
                'patients_count': len(patients_data),
                'session_id': session_id,
                'temp_dir': temp_dir
            }
        )
        
        return Response({
            'patients': patients_data,
            'summary': {
                'files_processed': len(processed_files),
                'patients_found': len(patients_data),
                'series_found': sum(len(p['series']) for p in patients_data),
                'errors': errors
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Import failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_dicom_series(request):
    """
    Initiate DICOM transfer for selected series.
    """
    try:
        series_to_send = request.data.get('seriesToSend', [])
        
        if not series_to_send:
            return Response({
                'error': 'No series specified for transfer'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Initialize transfer service
        transfer_service = DICOMTransferService()
        
        # Create transfer logs and initiate transfers
        transfer_tasks = []
        
        for series_transfer in series_to_send:
            series_id = series_transfer.get('seriesId')
            destination_id = series_transfer.get('destination')
            
            if not series_id or not destination_id:
                continue
            
            # Get series files from cache
            series_data = SERIES_FILE_CACHE.get(series_id)
            if not series_data:
                continue
            
            # Verify user owns this series
            if series_data['user_id'] != request.user.id:
                continue
            
            # Get destination
            from destinations.models import Destination
            try:
                destination = Destination.objects.get(id=destination_id, enabled=True)
            except Destination.DoesNotExist:  # type: ignore[attr-defined]
                continue
            
            # Create transfer log
            file_list = series_data['files']
            if file_list:
                first_file_metadata = next(
                    (f for f in file_list if isinstance(f, dict)), 
                    {}
                )
                
                transfer_log = TransferLog.objects.create(
                    user=request.user,
                    action='send',
                    status='pending',
                    destination=destination,
                    patient_name=first_file_metadata.get('patient_name', ''),
                    patient_id=first_file_metadata.get('patient_id', ''),
                    study_instance_uid=first_file_metadata.get('study_instance_uid', ''),
                    series_instance_uid=first_file_metadata.get('series_instance_uid', ''),
                    series_description=first_file_metadata.get('series_description', ''),
                    modality=first_file_metadata.get('modality', ''),
                    instance_count=len(file_list),
                    details={
                        'series_id': series_id,
                        'files': [f.get('file_path') if isinstance(f, dict) else str(f) for f in file_list]
                    }
                )
                
                transfer_tasks.append({
                    'log_id': transfer_log.id,
                    'series_id': series_id,
                    'destination': destination,
                    'files': [f.get('file_path') if isinstance(f, dict) else str(f) for f in file_list]
                })
        
        if not transfer_tasks:
            return Response({
                'error': 'No valid series found for transfer'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Start transfers in background threads
        with ThreadPoolExecutor(max_workers=3) as executor:
            for task in transfer_tasks:
                executor.submit(
                    transfer_service.transfer_series,
                    task['log_id'],
                    task['files'],
                    task['destination']
                )
        
        return Response({
            'message': f'Transfer initiated for {len(transfer_tasks)} series',
            'transfer_count': len(transfer_tasks)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Transfer initiation failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_transfer_status(request):
    """
    Get status of ongoing and recent transfers.
    """
    try:
        # Get series IDs from query parameters
        series_ids = request.GET.get('series_ids', '').split(',')
        series_ids = [sid.strip() for sid in series_ids if sid.strip()]
        
        # Query transfer logs
        queryset = TransferLog.objects.filter(
            user=request.user,
            action='send'
        ).order_by('-timestamp')
        
        # Filter by series IDs if provided
        if series_ids:
            queryset = queryset.filter(
                details__series_id__in=series_ids
            )
        else:
            # Default to recent transfers (last 24 hours)
            from django.utils import timezone
            from datetime import timedelta
            since = timezone.now() - timedelta(hours=24)
            queryset = queryset.filter(timestamp__gte=since)
        
        # Limit results
        queryset = queryset[:50]
        
        # Serialize results
        transfer_logs = TransferLogSerializer(queryset, many=True).data
        
        # Format response for frontend
        series_status = []
        for log in transfer_logs:
            series_id = log.get('details', {}).get('series_id')
            if series_id:
                series_status.append({
                    'id': series_id,
                    'status': log['status'],
                    'message': log.get('error_message', ''),
                    'timestamp': log['timestamp'],
                    'completed_at': log.get('completed_at'),
                    'destination': log.get('destination_name', ''),
                    'patient_name': log.get('patient_name', ''),
                    'series_description': log.get('series_description', '')
                })
        
        return Response({
            'series': series_status
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Status retrieval failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TransferLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing transfer logs (audit logs).
    Admins can see all logs, regular users see only their own.
    """
    serializer_class = TransferLogListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['patient_name', 'series_description', 'error_message']
    ordering_fields = ['timestamp', 'status', 'action']
    ordering = ['-timestamp']
    
    def get_queryset(self):
        """Return filtered queryset based on user permissions."""
        queryset = TransferLog.objects.all()
        
        # Non-admin users can only see their own logs
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            queryset = queryset.filter(user=self.request.user)
        
        # Apply filters from query parameters
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        action_filter = self.request.query_params.get('action')
        if action_filter:
            queryset = queryset.filter(action=action_filter)
        
        user_filter = self.request.query_params.get('user')
        if user_filter and (self.request.user.is_staff or self.request.user.is_superuser):
            queryset = queryset.filter(user__username__icontains=user_filter)
        
        start_date = self.request.query_params.get('startDate')
        if start_date:
            queryset = queryset.filter(timestamp__date__gte=start_date)
        
        end_date = self.request.query_params.get('endDate')
        if end_date:
            queryset = queryset.filter(timestamp__date__lte=end_date)
        
        return queryset
    
    def get_serializer_class(self):
        """Return detailed serializer for retrieve action."""
        if self.action == 'retrieve':
            return TransferLogSerializer
        return TransferLogListSerializer
