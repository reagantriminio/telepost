from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model with admin role indication.
    """
    is_admin = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'is_active', 'is_staff', 'is_admin', 'full_name', 'date_joined'
        ]
        read_only_fields = ['id', 'is_staff', 'is_admin', 'date_joined']
    
    def get_is_admin(self, obj):
        """Return True if user has admin privileges."""
        return obj.is_staff or obj.is_superuser
    
    def get_full_name(self, obj):
        """Return user's full name or username if no name provided."""
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name if full_name else obj.username

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that includes user information in the token.
    """
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['username'] = user.username
        token['email'] = user.email
        token['is_admin'] = user.is_staff or user.is_superuser
        token['full_name'] = f"{user.first_name} {user.last_name}".strip() or user.username
        
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add user data to response
        data['user'] = UserSerializer(self.user).data  # type: ignore
        
        return data

class LoginSerializer(serializers.Serializer):
    """
    Serializer for login requests.
    """
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, style={'input_type': 'password'})
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if not username or not password:
            raise serializers.ValidationError('Username and password are required.')
        
        return attrs 