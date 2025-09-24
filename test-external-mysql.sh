#!/bin/bash

# Test script for building Docker images with external MySQL
# Run this on Linux server to test the build process

set -e

echo "🧪 Testing Docker build process with external MySQL..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker compose is available
if ! docker compose version > /dev/null 2>&1; then
    echo "❌ Docker Compose is not available. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Test backend build
echo "🔨 Testing backend build..."
if docker compose build backend; then
    echo "✅ Backend build successful"
else
    echo "❌ Backend build failed"
    exit 1
fi

# Test frontend build
echo "🔨 Testing frontend build..."
if docker compose build frontend; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo "🎉 All builds completed successfully!"
echo "📋 Built images:"
docker images | grep cost-calculation

echo ""
echo "🚀 Ready to deploy with:"
echo "   docker compose up -d"
echo ""
echo "📝 Note: Make sure MySQL is running on host and accessible via host.docker.internal"
echo "   - Check MySQL status: sudo systemctl status mysql"
echo "   - Check MySQL config: sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf"
echo "   - Ensure bind-address = 0.0.0.0 in MySQL config"
