from django.db import models
from django.contrib.auth.models import User
from destinations.models import Destination

# Create your models here.

class TransferLog(models.Model):
    """
    Model to record DICOM transfer operations for audit purposes.
    Each series transfer creates one log entry.
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sending', 'Sending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]
    
    ACTION_CHOICES = [
        ('import', 'Import DICOM Files'),
        ('send', 'Send DICOM Series'),
        ('test_connection', 'Test Destination Connection'),
    ]
    
    # Core fields
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        help_text="User who initiated the action"
    )
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        help_text="Type of action performed"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text="When the action was initiated"
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the action was completed"
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Current status of the operation"
    )
    
    # DICOM-specific fields
    patient_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Patient name from DICOM metadata"
    )
    patient_id = models.CharField(
        max_length=64,
        blank=True,
        help_text="Patient ID from DICOM metadata"
    )
    study_instance_uid = models.CharField(
        max_length=64,
        blank=True,
        help_text="Study Instance UID"
    )
    series_instance_uid = models.CharField(
        max_length=64,
        blank=True,
        help_text="Series Instance UID"
    )
    series_description = models.CharField(
        max_length=255,
        blank=True,
        help_text="Series description from DICOM metadata"
    )
    modality = models.CharField(
        max_length=16,
        blank=True,
        help_text="DICOM modality (CT, MR, XR, etc.)"
    )
    instance_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Number of DICOM instances in the series"
    )

    # Explicit manager annotation for static type checkers (e.g., mypy)
    objects: models.Manager = models.Manager()
    
    # Transfer-specific fields
    destination = models.ForeignKey(
        Destination,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="DICOM destination for send operations"
    )
    
    # Results and error tracking
    error_message = models.TextField(
        blank=True,
        help_text="Error message if the operation failed"
    )
    details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional operation details (duration, file paths, etc.)"
    )
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Transfer Log"
        verbose_name_plural = "Transfer Logs"
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['status', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
        ]

    def __str__(self):
        action_display = self.get_action_display()  # type: ignore
        if self.series_description:
            return f"{action_display}: {self.series_description} ({self.status})"
        elif self.patient_name:
            return f"{action_display}: {self.patient_name} ({self.status})"
        else:
            return f"{action_display} by {self.user.username} ({self.status})"  # type: ignore

    def mark_completed(self, status, error_message=None, **details):
        """Mark the operation as completed with the given status."""
        from django.utils import timezone
        
        self.status = status
        self.completed_at = timezone.now()
        if error_message:
            self.error_message = error_message
        if details:
            self.details.update(details)  # type: ignore
        self.save()

    def get_duration(self):
        """Get the duration of the operation if completed."""
        if self.completed_at and self.timestamp:
            return self.completed_at - self.timestamp  # type: ignore
        return None

    def is_completed(self):
        """Check if the operation is in a final state."""
        return self.status in ['success', 'failed']
