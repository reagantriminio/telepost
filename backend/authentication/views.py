from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .serializers import UserSerializer, CustomTokenObtainPairSerializer
from rest_framework import generics, permissions, views
from typing import Dict, Any, cast

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom JWT token view that returns user information along with tokens.
    """
    serializer_class = CustomTokenObtainPairSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Authenticate user and return JWT tokens.
    """
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({
            'error': 'Username and password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(username=username, password=password)
    
    if user is None:
        return Response({
            'error': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    if not user.is_active:
        return Response({
            'error': 'User account is disabled'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Generate tokens
    refresh = RefreshToken.for_user(user)
    access_token = refresh.access_token
    
    # Update last login
    from django.contrib.auth import login
    login(request, user)
    
    return Response({
        'access': str(access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout user by blacklisting the refresh token.
    """
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        
        return Response({
            'message': 'Successfully logged out'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': 'Invalid token'
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """
    Return current authenticated user information.
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user_view(request):
    """
    Update current user's profile information.
    """
    serializer = UserSerializer(
        request.user, 
        data=request.data, 
        partial=True
    )
    
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    return Response(
        serializer.errors, 
        status=status.HTTP_400_BAD_REQUEST
    )


# ------------------------------
# Admin / registration endpoints
# ------------------------------


class RegisterView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            data: Dict[str, Any] = cast(Dict[str, Any], serializer.validated_data)
            username = data.get("username")
            email    = data.get("email", "")

            user = User(username=username, email=email)
            user.set_password(request.data.get("password"))
            user.save()
            return Response({'message': 'User created successfully'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
        return Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)


class UserListView(generics.ListAPIView):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


class CurrentUserView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UserDetailView(generics.DestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
