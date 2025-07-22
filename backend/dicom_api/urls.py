from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()
router.register(r'logs', views.TransferLogViewSet, basename='transferlog')

urlpatterns = [
    # DICOM operations
    path('import/', views.import_dicom_files, name='dicom_import'),
    path('send/', views.send_dicom_series, name='dicom_send'),
    path('status/', views.get_transfer_status, name='dicom_status'),
    
    # Audit logs (ViewSet routes)
    path('', include(router.urls)),
] 