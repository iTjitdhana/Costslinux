@echo off
REM Cost Calculation System Deployment Script for Windows
REM This script deploys the application using Docker Compose

setlocal enabledelayedexpansion

echo 🚀 Starting deployment of cost-calculation-system...

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Docker Compose is not installed. Please install Docker Compose first.
        pause
        exit /b 1
    )
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  .env file not found. Creating from template...
    if exist "config.env.example" (
        copy config.env.example .env
        echo 📝 Please edit .env file with your configuration before running again.
        pause
        exit /b 1
    ) else (
        echo ❌ No .env template found. Please create .env file manually.
        pause
        exit /b 1
    )
)

REM Stop existing containers
echo 🛑 Stopping existing containers...
docker compose down

REM Pull latest images
echo 📥 Pulling latest images...
docker compose pull

REM Build images if needed
echo 🔨 Building images...
docker compose build --no-cache

REM Start services
echo 🚀 Starting services...
docker compose up -d

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 30 /nobreak >nul

REM Check service health
echo 🔍 Checking service health...

REM Check backend health
curl -f http://localhost:3104/health >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend health check failed
    docker compose logs backend
    pause
    exit /b 1
) else (
    echo ✅ Backend is healthy
)

REM Check frontend health
curl -f http://localhost:80 >nul 2>&1
if errorlevel 1 (
    echo ❌ Frontend health check failed
    docker compose logs frontend
    pause
    exit /b 1
) else (
    echo ✅ Frontend is healthy
)

REM Show running containers
echo 📋 Running containers:
docker compose ps

REM Clean up unused images
echo 🧹 Cleaning up unused Docker images...
docker image prune -f

echo 🎉 Deployment completed successfully!
echo 📊 Application URLs:
echo    Frontend: http://localhost
echo    Backend API: http://localhost:3104
echo    Health Check: http://localhost:3104/health
echo    Database: localhost:3306 (main), localhost:3307 (default_itemvalue)
echo.
echo 📝 Useful commands:
echo    View logs: docker compose logs -f
echo    Stop services: docker compose down
echo    Restart services: docker compose restart
echo    Update services: deploy.bat

pause
