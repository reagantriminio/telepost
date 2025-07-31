#!/bin/bash

# Telepost Service Startup Script
# Run this script as root (sudo) to start the entire service

set -e  # Exit on any error

echo "🚀 Starting Telepost Service Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
apt update -y

# Install required packages
print_status "Installing required packages..."
apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib nginx git curl wget

# Install Node.js and npm
print_status "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install DCMTK for DICOM operations
print_status "Installing DCMTK..."
apt install -y dcmtk libjpeg-turbo8

# Create application directory
print_status "Creating application directory..."
mkdir -p /home/administrator/desktop/mimic/telepost
cd /home/administrator/desktop/mimic/telepost

# Clone the repository (replace with your actual repo URL)
print_status "Cloning repository..."
if [ ! -d ".git" ]; then
    # If you have the code locally, you can copy it instead:
    # cp -r /path/to/your/local/telepost/* /home/administrator/desktop/mimic/telepost/
    print_warning "Please copy your telepost code to /home/administrator/desktop/mimic/telepost/ manually"
    print_warning "Or uncomment and modify the git clone command below"
    # git clone https://github.com/yourusername/telepost.git .
fi

# Set up PostgreSQL
print_status "Setting up PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE dicom_transfer;" || print_warning "Database might already exist"
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';" || print_warning "User might already exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE dicom_transfer TO postgres;" || print_warning "Privileges might already be set"

# Backend setup
print_status "Setting up Django backend..."
cd /home/administrator/desktop/mimic/telepost/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install django-cors-headers

# Create .env file for backend
cat > .env << EOF
DEBUG=False
SECRET_KEY=your-secret-key-change-this-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,10.200.20.37

# Database settings
DB_NAME=dicom_transfer
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# DICOM settings
STORESCU_PATH=storescu

# CORS settings
CORS_ALLOWED_ORIGINS=http://10.200.20.37
CORS_ALLOW_CREDENTIALS=True

# Session settings
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False
CSRF_TRUSTED_ORIGINS=http://10.200.20.37

# File upload settings
DATA_UPLOAD_MAX_MEMORY_SIZE=8589934592
FILE_UPLOAD_MAX_MEMORY_SIZE=8589934592
DATA_UPLOAD_MAX_NUMBER_FIELDS=10000
DATA_UPLOAD_MAX_NUMBER_FILES=10000
EOF

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser (non-interactive)
print_status "Creating superuser..."
echo "from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@example.com', 'admin123') if not User.objects.filter(username='admin').exists() else None" | python manage.py shell

# Collect static files
python manage.py collectstatic --noinput

# Create systemd service for backend
print_status "Creating systemd service for backend..."
cat > /etc/systemd/system/telepost-backend.service << EOF
[Unit]
Description=Telepost Django Backend
After=network.target postgresql.service

[Service]
Type=exec
User=www-data
Group=www-data
WorkingDirectory=/home/administrator/desktop/mimic/telepost/backend
Environment=PATH=/home/administrator/desktop/mimic/telepost/backend/venv/bin
ExecStart=/home/administrator/desktop/mimic/telepost/backend/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 dicom_transfer.wsgi:application
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Frontend setup
print_status "Setting up React frontend..."
cd /home/administrator/desktop/mimic/telepost/frontend

# Install Node.js dependencies
npm install

# Create production environment file
cat > .env.production << EOF
VITE_API_URL=http://10.200.20.37/api
EOF

# Also create .env for development
cat > .env << EOF
VITE_API_URL=http://10.200.20.37/api
EOF

# Build frontend
npm run build

# Copy built files to nginx directory
cp -r dist/* /var/www/html/

# Create nginx configuration
print_status "Configuring Nginx..."
cat > /etc/nginx/sites-available/telepost << EOF
server {
    listen 80;
    server_name 10.200.20.37;
    
    # Global upload limits
    client_max_body_size 8G;

    # Frontend
    location / {
        root /var/www/html;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Increase upload limits for DICOM files
        client_max_body_size 8G;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Static files
    location /static/ {
        alias /home/administrator/desktop/mimic/telepost/backend/staticfiles/;
    }

    # Media files
    location /media/ {
        alias /home/administrator/desktop/mimic/telepost/backend/media/;
    }
}
EOF

# Enable nginx site
ln -sf /etc/nginx/sites-available/telepost /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Set proper permissions
chown -R www-data:www-data /home/administrator/desktop/mimic/telepost
chown -R www-data:www-data /var/www/html

# Start services
print_status "Starting services..."
systemctl daemon-reload
systemctl enable telepost-backend
systemctl start telepost-backend
systemctl restart nginx

# Create logs directory
mkdir -p /home/administrator/desktop/mimic/telepost/logs
chown www-data:www-data /home/administrator/desktop/mimic/telepost/logs

# Final status check
print_status "Checking service status..."
systemctl status telepost-backend --no-pager
systemctl status nginx --no-pager

echo ""
echo -e "${GREEN}✅ Telepost service setup complete!${NC}"
echo ""
echo "🌐 Access the application at: http://10.200.20.37"
echo "👤 Login credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📁 Application files: /home/administrator/desktop/mimic/telepost"
echo "📋 Logs: /home/administrator/desktop/mimic/telepost/logs"
echo ""
echo "🔧 Useful commands:"
echo "   sudo systemctl status telepost-backend"
echo "   sudo systemctl restart telepost-backend"
echo "   sudo systemctl status nginx"
echo "   sudo journalctl -u telepost-backend -f"
echo ""
echo "⚠️  Remember to:"
echo "   1. Change the SECRET_KEY in /home/administrator/desktop/mimic/telepost/backend/.env"
echo "   2. ALLOWED_HOSTS already configured for 10.200.20.37"
echo "   3. Change default passwords"
echo "   4. Configure firewall if needed" 