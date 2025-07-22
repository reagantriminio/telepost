-- Database initialization script for Telepost DICOM Transfer Application
-- This script runs when the PostgreSQL container starts for the first time

-- Create additional extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create indexes for better performance (Django will create these, but good to have them explicitly)
-- Note: Tables will be created by Django migrations

-- Log the completion
\echo 'Database initialization completed successfully'; 