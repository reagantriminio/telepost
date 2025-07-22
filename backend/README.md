# DICOM Transfer Backend

Django REST Framework backend for the DICOM Transfer Web Application. This backend handles DICOM file import, parsing, transfer orchestration, and audit logging.

## Features

### ✅ Implemented Features

**🔐 Authentication & Authorization**
- JWT-based authentication with refresh tokens
- Role-based access control (User/Admin)
- Custom permissions for admin-only operations

**📁 DICOM File Processing**
- File upload handling with multipart form data
- DICOM parsing using pydicom library
- Metadata extraction and grouping by patient/series
- Temporary file management with automatic cleanup

**🚀 Transfer Management**
- Integration with DCMTK storescu for DICOM transfers
- Multi-threaded transfer execution
- Real-time status tracking and updates
- Comprehensive error handling and logging

**📊 Audit Logging**
- Complete transfer history tracking
- Filterable and searchable logs
- Role-based log access (users see own, admins see all)
- Pagination support for large datasets

**🎯 Destination Management**
- CRUD operations for DICOM destinations
- Connection testing with echoscu
- Admin-only destination management
- Input validation and DICOM compliance

## Technology Stack

- **Django 5.2** - Web framework and ORM
- **Django REST Framework 3.16** - API framework
- **PostgreSQL** - Primary database
- **pydicom 3.0** - DICOM file parsing
- **DCMTK storescu** - DICOM transfer utility
- **SimpleJWT** - JWT authentication

## Project Structure

```
backend/
├── dicom_transfer/          # Main Django project
│   ├── settings.py          # Django configuration
│   ├── urls.py              # Main URL routing
│   └── wsgi.py              # WSGI application
├── authentication/          # User authentication app
│   ├── views.py             # JWT auth views
│   ├── serializers.py       # User serializers
│   └── urls.py              # Auth endpoints
├── destinations/            # DICOM destinations app
│   ├── models.py            # Destination model
│   ├── views.py             # Destination CRUD views
│   ├── serializers.py       # Destination serializers
│   ├── permissions.py       # Custom permissions
│   └── urls.py              # Destination endpoints
├── dicom_api/              # DICOM operations app
│   ├── models.py            # TransferLog model
│   ├── views.py             # DICOM import/transfer views
│   ├── serializers.py       # DICOM serializers
│   ├── services.py          # DICOM parsing/transfer services
│   └── urls.py              # DICOM endpoints
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Database Models

### User (Django built-in)
- Uses Django's default User model
- `is_staff=True` indicates admin privileges
- Stores username, email, password, etc.

### Destination
```python
- name: CharField (unique identifier)
- ae_title: CharField (DICOM AE Title, max 16 chars)
- host: CharField (hostname/IP)
- port: PositiveIntegerField (default 104)
- description: TextField (optional)
- enabled: BooleanField (default True)
- created_by: ForeignKey(User)
- created_at/updated_at: DateTimeField
```

### TransferLog
```python
- user: ForeignKey(User)
- action: CharField (import/send/test_connection)
- timestamp: DateTimeField
- completed_at: DateTimeField (nullable)
- status: CharField (pending/sending/success/failed)
- patient_name/patient_id: CharField
- study_instance_uid: CharField
- series_instance_uid: CharField
- series_description: CharField
- modality: CharField
- instance_count: PositiveIntegerField
- destination: ForeignKey(Destination)
- error_message: TextField
- details: JSONField (additional metadata)
```

## API Endpoints

### Authentication (`/api/auth/`)
- `POST /login/` - User login (returns JWT tokens)
- `POST /logout/` - User logout (blacklist refresh token)
- `POST /refresh/` - Refresh access token
- `GET /user/` - Get current user info
- `PUT /user/update/` - Update user profile

### DICOM Operations (`/api/dicom/`)
- `POST /import/` - Import DICOM files
- `POST /send/` - Initiate DICOM transfers
- `GET /status/` - Get transfer status
- `GET /logs/` - List transfer logs (audit)
- `GET /logs/{id}/` - Get detailed log entry

### Destinations (`/api/destinations/`)
- `GET /` - List destinations
- `POST /` - Create destination (admin only)
- `GET /{id}/` - Get destination details
- `PUT /{id}/` - Update destination (admin only)
- `DELETE /{id}/` - Delete destination (admin only)
- `POST /{id}/test_connection/` - Test destination connectivity

## Getting Started

### Prerequisites

1. **Python 3.8+** and pip
2. **PostgreSQL 12+** database
3. **DCMTK toolkit** installed and accessible
   ```bash
   # Ubuntu/Debian
   sudo apt-get install dcmtk
   
   # macOS
   brew install dcmtk
   
   # Or download from https://dicom.offis.de/dcmtk
   ```

### Installation

1. **Create virtual environment:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   Create `.env` file in backend directory:
   ```bash
   SECRET_KEY=your-secret-key-here
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1
   
   DB_NAME=dicom_transfer
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_HOST=localhost
   DB_PORT=5432
   
   STORESCU_PATH=storescu
   ```

4. **Setup database:**
   ```bash
   # Create PostgreSQL database
   createdb dicom_transfer
   
   # Run migrations
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Create superuser:**
   ```bash
   python manage.py createsuperuser
   ```

6. **Start development server:**
   ```bash
   python manage.py runserver
   ```

The API will be available at http://localhost:8000/api/

### Production Deployment

1. **Environment Configuration:**
   - Set `DEBUG=False`
   - Configure secure `SECRET_KEY`
   - Set appropriate `ALLOWED_HOSTS`
   - Configure production database

2. **Static Files:**
   ```bash
   python manage.py collectstatic
   ```

3. **WSGI Server:**
   Use gunicorn, uWSGI, or similar:
   ```bash
   pip install gunicorn
   gunicorn dicom_transfer.wsgi:application
   ```

## DICOM Transfer Workflow

### File Import Process
1. Frontend uploads files via multipart form data
2. Backend saves files to temporary directory
3. pydicom parses each file for metadata
4. Files grouped by Patient ID/Series UID
5. Grouped data returned to frontend
6. File paths cached for transfer operations

### Transfer Process
1. Frontend selects series and destinations
2. Backend creates TransferLog entries
3. Transfer service validates files and destinations
4. storescu executed in background threads
5. Transfer status updated in real-time
6. Temporary files cleaned up after completion

### Audit Logging
- Every operation logged with timestamp
- User attribution for all actions
- Detailed error messages for failures
- Filterable by date, status, user, action
- Paginated responses for performance

## Security Considerations

### Authentication
- JWT tokens with configurable expiration
- Refresh token rotation and blacklisting
- Password validation and hashing

### Authorization
- Role-based access control
- Admin-only destination management
- User isolation for logs and operations

### Input Validation
- DICOM file format validation
- Destination parameter validation
- SQL injection prevention via ORM
- File upload size limits

### Data Protection
- Temporary file cleanup
- Secure file path handling
- No sensitive data in logs
- Database connection encryption

## Monitoring & Logging

### Application Logs
```python
LOGGING = {
    'handlers': {
        'file': {
            'filename': 'logs/dicom_transfer.log',
        },
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'dicom_transfer': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
        },
    },
}
```

### Health Monitoring
- Transfer success/failure rates
- Response time monitoring
- Database connection health
- DCMTK availability checks

## Troubleshooting

### Common Issues

**"storescu command not found":**
- Install DCMTK toolkit
- Update `STORESCU_PATH` in environment
- Check PATH environment variable

**Database connection errors:**
- Verify PostgreSQL is running
- Check database credentials
- Ensure database exists

**DICOM parsing failures:**
- Verify files are valid DICOM format
- Check file permissions
- Review pydicom error messages

**Transfer timeouts:**
- Check network connectivity to destinations
- Verify destination DICOM service is running
- Increase timeout values if needed

### Debug Mode

Enable detailed logging:
```bash
DEBUG=True
LOGGING_LEVEL=DEBUG
```

Test DCMTK connectivity:
```bash
# Test storescu availability
storescu --help

# Test destination connectivity
echoscu -aet TELEPOST -aec DESTINATION_AE hostname port
```

## Development

### Adding New Features

1. **Models:** Add to appropriate app's `models.py`
2. **Serializers:** Create DRF serializers
3. **Views:** Implement API views/viewsets
4. **URLs:** Add routing configuration
5. **Permissions:** Apply appropriate access control
6. **Tests:** Write comprehensive test coverage

### Code Quality
```bash
# Format code
black .

# Lint code
flake8 .

# Run tests
python manage.py test
```

## Contributing

1. Follow Django/DRF best practices
2. Write comprehensive tests
3. Document new API endpoints
4. Update models and migrations
5. Ensure DICOM compliance

## License

This project is part of the DICOM Transfer Web Application system. 