from rest_framework import serializers
from .models import TransferLog
from destinations.serializers import DestinationListSerializer

class TransferLogSerializer(serializers.ModelSerializer):
    """
    Serializer for TransferLog model.
    """
    username = serializers.CharField(source='user.username', read_only=True)
    destination_name = serializers.CharField(source='destination.name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    duration = serializers.SerializerMethodField()
    
    class Meta:
        model = TransferLog
        fields = [
            'id', 'user', 'username', 'action', 'action_display', 
            'timestamp', 'completed_at', 'status', 'status_display',
            'patient_name', 'patient_id', 'study_instance_uid', 
            'series_instance_uid', 'series_description', 'modality',
            'instance_count', 'bytes_transferred', 'destination', 'destination_name',
            'error_message', 'details', 'duration'
        ]
        read_only_fields = ['id', 'timestamp', 'user']
    
    def get_duration(self, obj):
        """Get the duration of the operation in seconds."""
        duration = obj.get_duration()
        if duration:
            return duration.total_seconds()
        return None

class TransferLogListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing transfer logs.
    """
    username = serializers.CharField(source='user.username', read_only=True)
    destination_name = serializers.CharField(source='destination.name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = TransferLog
        fields = [
            'id', 'username', 'action_display', 'timestamp', 
            'status', 'status_display', 'patient_name', 
            'series_description', 'bytes_transferred', 'destination_name', 'error_message'
        ]

class DICOMImportResponseSerializer(serializers.Serializer):
    """
    Serializer for DICOM import response.
    """
    patients = serializers.ListField(child=serializers.DictField())
    summary = serializers.DictField()

class DICOMSendRequestSerializer(serializers.Serializer):
    """
    Serializer for DICOM send request.
    """
    seriesToSend = serializers.ListField(
        child=serializers.DictField(),
        required=True,
        help_text="List of series to send with seriesId and destination"
    )
    
    def validate_seriesToSend(self, value):
        """Validate the series to send data structure."""
        if not value:
            raise serializers.ValidationError("At least one series must be specified")
        
        for series in value:
            if 'seriesId' not in series:
                raise serializers.ValidationError("Each series must have a seriesId")
            if 'destination' not in series:
                raise serializers.ValidationError("Each series must have a destination")
        
        return value

class DICOMStatusResponseSerializer(serializers.Serializer):
    """
    Serializer for DICOM transfer status response.
    """
    series = serializers.ListField(child=serializers.DictField()) 