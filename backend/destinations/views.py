from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import Destination
from .serializers import DestinationSerializer, DestinationCreateSerializer, DestinationListSerializer
from .permissions import IsAdminOrReadOnly

# Create your views here.

class DestinationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing DICOM destinations.
    Admins can perform all operations, regular users can only list.
    """
    queryset = Destination.objects.filter(enabled=True).order_by('name')  # type: ignore
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return DestinationListSerializer
        elif self.action == 'create':
            return DestinationCreateSerializer
        else:
            return DestinationSerializer
    
    def get_queryset(self):
        """Return filtered queryset."""
        queryset = Destination.objects.order_by('name')  # type: ignore
        
        # Only show enabled destinations to non-admins
        if not (self.request.user.is_staff or self.request.user.is_superuser):
            queryset = queryset.filter(enabled=True)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set the created_by field when creating a destination."""
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def test_connection(self, request, pk=None):
        """
        Test connectivity to a DICOM destination.
        """
        destination = self.get_object()
        
        try:
            from dicom_api.services import DICOMTransferService
            transfer_service = DICOMTransferService()
            result = transfer_service.test_destination(destination)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Test failed: {str(e)}',
                'details': '',
                'response_time': None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
