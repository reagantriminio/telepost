from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView,
    RegisterView,
    LogoutView,
    UserListView,
    UserDetailView,
    current_user_view,
    UserPasswordResetView,
    AdminCreateUserView,
)


urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('users/', UserListView.as_view(), name='user_list'),  # admin only
    path('users/<int:pk>/', UserDetailView.as_view(), name='user_detail'),  # delete
    path('users/<int:pk>/reset_password/', UserPasswordResetView.as_view(), name='user_reset_password'),
    path('users/create/', AdminCreateUserView.as_view(), name='admin_create_user'),
    path('user/', current_user_view, name='current_user'),
] 