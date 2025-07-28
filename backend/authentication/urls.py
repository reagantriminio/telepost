from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView,
    RegisterView,
    LogoutView,
    UserListView,
    CurrentUserView,
    UserDetailView,
)


urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('users/', UserListView.as_view(), name='user_list'),  # admin only
    path('users/<int:pk>/', UserDetailView.as_view(), name='user_detail'),  # delete
    path('user/', CurrentUserView.as_view(), name='current_user'),
] 