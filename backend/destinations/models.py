from django.db import models
from django.contrib.auth.models import User

class Destination(models.Model):
    """
    Model to store DICOM destination configurations.
    Only admin users can create, edit, or delete destinations.
    """
    name = models.CharField(
        max_length=100, 
        unique=True,
        help_text="Human-friendly identifier (e.g., 'PACS Alpha')"
    )
    ae_title = models.CharField(
        max_length=16,
        help_text="AE Title of the destination DICOM application"
    )
    host = models.CharField(
        max_length=255,
        help_text="Hostname or IP address of the destination"
    )
    port = models.PositiveIntegerField(
        default=104,  # type: ignore
        help_text="Port number for DICOM service"
    )
    description = models.TextField(
        blank=True,
        help_text="Optional description of the destination"
    )
    enabled = models.BooleanField(
        default=True,  # type: ignore
        help_text="Whether this destination is active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Admin user who created this destination"
    )

    class Meta:
        ordering = ['name']
        verbose_name = "DICOM Destination"
        verbose_name_plural = "DICOM Destinations"

    def __str__(self):
        return f"{self.name} ({self.ae_title}@{self.host}:{self.port})"

    # Annotation for static type checkers
    objects: models.Manager = models.Manager()

    def clean(self):
        """Validate the model fields."""
        from django.core.exceptions import ValidationError
        
        # Validate AE Title length (DICOM standard allows max 16 characters)
        if self.ae_title and len(str(self.ae_title)) > 16:
            raise ValidationError("AE Title cannot exceed 16 characters")
        
        # Validate port range
        if self.port and not (1 <= self.port <= 65535):
            raise ValidationError("Port must be between 1 and 65535")

    def is_reachable(self):
        """
        Test if the destination is reachable.
        This could be enhanced to actually test DICOM connectivity.
        """
        import socket
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)  # 5 second timeout
            result = sock.connect_ex((self.host, self.port))
            sock.close()
            return result == 0
        except Exception:
            return False
