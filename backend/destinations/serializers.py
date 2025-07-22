from rest_framework import serializers
from .models import Destination

class DestinationSerializer(serializers.ModelSerializer):
    """
    Serializer for Destination model.
    """
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    is_reachable = serializers.SerializerMethodField()
    
    class Meta:
        model = Destination
        fields = [
            'id', 'name', 'ae_title', 'host', 'port', 'description', 
            'enabled', 'created_at', 'updated_at', 'created_by', 
            'created_by_username', 'is_reachable'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']
    
    def get_is_reachable(self, obj):
        """
        Check if destination is reachable.
        This is expensive so we might want to cache or make it optional.
        """
        # For now, skip the actual connectivity test to avoid slow API responses
        # In production, this could be done asynchronously or on-demand
        return None
    
    def validate_ae_title(self, value):
        """Validate AE Title according to DICOM standards."""
        if len(value) > 16:
            raise serializers.ValidationError("AE Title cannot exceed 16 characters")
        
        # AE Title should contain only alphanumeric characters and spaces
        if not value.replace(' ', '').replace('_', '').replace('-', '').isalnum():
            raise serializers.ValidationError(
                "AE Title should contain only alphanumeric characters, spaces, hyphens, and underscores"
            )
        
        return value.strip()
    
    def validate_port(self, value):
        """Validate port number range."""
        if not (1 <= value <= 65535):
            raise serializers.ValidationError("Port must be between 1 and 65535")
        return value
    
    def validate_name(self, value):
        """Validate destination name uniqueness."""
        if self.instance:
            # Update case - exclude current instance from uniqueness check
            if Destination.objects.filter(name=value).exclude(id=self.instance.id).exists():  # type: ignore
                raise serializers.ValidationError("A destination with this name already exists")
        else:
            # Create case
            if Destination.objects.filter(name=value).exists():  # type: ignore
                raise serializers.ValidationError("A destination with this name already exists")
        
        return value.strip()

class DestinationCreateSerializer(DestinationSerializer):
    """
    Serializer for creating new destinations (admin only).
    """
    
    def create(self, validated_data):
        # Set created_by to the current user if admin
        request = self.context.get('request')
        if request and request.user and request.user.is_staff:
            validated_data['created_by'] = request.user
        
        return super().create(validated_data)

class DestinationListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing destinations.
    """
    
    class Meta:
        model = Destination
        fields = ['id', 'name', 'ae_title', 'host', 'port', 'enabled'] 