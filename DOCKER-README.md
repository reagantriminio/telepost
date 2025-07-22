# Telepost DICOM Transfer Application - Docker Setup

This document provides instructions for running the Telepost DICOM Transfer Application using Docker containers.

## Architecture

The application consists of three separate Docker containers:

1. **Frontend** (React + Vite + Nginx) - Port 80
2. **Backend** (Django + DRF) - Port 8000  
3. **Database** (PostgreSQL) - Port 5432

## Prerequisites

- Docker (version 20.0 or higher)
- Docker Compose (version 2.0 or higher)
- At least 4GB RAM available
- At least 10GB disk space

## Quick Start

### Option 1: Using the Startup Script (Recommended)

```bash
./start-docker.sh
```

### Option 2: Manual Docker Compose

```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Service URLs

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **Database**: localhost:5432

## Environment Configuration

Copy `docker.env.example` to `.env` and modify as needed:

```bash
cp docker.env.example .env
```

Key variables to customize:
- `SECRET_KEY`: Generate a secure secret key for Django
- `POSTGRES_PASSWORD`: Set a secure database password
- `DEBUG`: Set to `0` for production

## DICOM Tools

The backend container includes DCMTK tools:
- `storescu`: For sending DICOM files
- `echoscu`: For testing DICOM connections

These are automatically configured and available at:
- `/usr/bin/storescu`
- `/usr/bin/echoscu`

## Data Persistence

The following volumes persist data:
- `postgres_data`: Database files
- `backend_media`: Uploaded DICOM files
- `backend_static`: Static files

## Development

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f database
```

### Accessing Containers

```bash
# Backend shell
docker-compose exec backend bash

# Database shell
docker-compose exec database psql -U telepost_user -d telepost_db

# Frontend shell
docker-compose exec frontend sh
```

### Rebuilding After Changes

```bash
# Rebuild specific service
docker-compose build backend
docker-compose up -d backend

# Rebuild all services
docker-compose up --build -d
```

## Production Deployment

### Security Checklist

1. **Change default passwords**:
   - Generate a new `SECRET_KEY`
   - Set a secure `POSTGRES_PASSWORD`

2. **Environment variables**:
   - Set `DEBUG=0`
   - Configure proper `ALLOWED_HOSTS`
   - Set correct `CORS_ALLOWED_ORIGINS`

3. **Network security**:
   - Don't expose database port in production
   - Use HTTPS with reverse proxy (nginx/Apache)
   - Implement proper firewall rules

### Production Docker Compose

Create a `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  database:
    # Remove exposed ports for security
    # ports: []  # Don't expose database port
    
  backend:
    environment:
      - DEBUG=0
      - ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
      - CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
    # Add SSL certificates volume if needed
    
  frontend:
    # Configure for HTTPS
    ports:
      - "443:443"
      - "80:80"
```

Run with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Check what's using the ports
   lsof -i :80
   lsof -i :8000
   lsof -i :5432
   
   # Modify ports in docker-compose.yml if needed
   ```

2. **Database connection errors**:
   ```bash
   # Check database is running
   docker-compose ps database
   
   # Check database logs
   docker-compose logs database
   
   # Test connection
   docker-compose exec database pg_isready -U telepost_user
   ```

3. **Backend startup errors**:
   ```bash
   # Check backend logs
   docker-compose logs backend
   
   # Run migrations manually
   docker-compose exec backend python manage.py migrate
   
   # Create superuser
   docker-compose exec backend python manage.py createsuperuser
   ```

4. **Frontend build errors**:
   ```bash
   # Check frontend logs
   docker-compose logs frontend
   
   # Rebuild frontend
   docker-compose build frontend
   docker-compose up -d frontend
   ```

5. **DCMTK tools not working**:
   ```bash
   # Verify tools are installed
   docker-compose exec backend which storescu
   docker-compose exec backend which echoscu
   
   # Test DCMTK installation
   docker-compose exec backend storescu --help
   ```

### Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# View health check logs
docker inspect telepost_backend --format='{{.State.Health.Status}}'
```

### Performance Tuning

1. **Increase memory limits**:
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             memory: 2G
   ```

2. **Use production WSGI server**:
   Replace `runserver` with `gunicorn` in backend Dockerfile:
   ```dockerfile
   CMD ["gunicorn", "--bind", "0.0.0.0:8000", "dicom_transfer.wsgi:application"]
   ```

3. **Enable nginx caching**:
   Modify `frontend/nginx.conf` to add caching directives.

## Backup and Restore

### Database Backup

```bash
# Backup
docker-compose exec database pg_dump -U telepost_user telepost_db > backup.sql

# Restore
docker-compose exec -T database psql -U telepost_user telepost_db < backup.sql
```

### Volume Backup

```bash
# Backup volumes
docker run --rm -v telepost_postgres_data:/data -v $(pwd):/backup busybox tar czf /backup/postgres_backup.tar.gz /data
```

## Monitoring

### Basic Monitoring

```bash
# Resource usage
docker stats

# Container status
docker-compose ps

# Service logs
docker-compose logs --tail=100 -f
```

### Advanced Monitoring

Consider adding monitoring tools like:
- Prometheus + Grafana
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Docker monitoring solutions

## Support

For issues related to:
- **Docker setup**: Check this README and troubleshooting section
- **Application features**: Refer to the main README.md
- **DICOM functionality**: Check DCMTK documentation 