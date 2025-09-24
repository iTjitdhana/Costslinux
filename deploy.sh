#!/bin/bash

# Cost Calculation System Deployment Script
# This script deploys the application using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="cost-calculation-system"
DOCKER_COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

echo -e "${BLUE}🚀 Starting deployment of ${PROJECT_NAME}...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    if [ -f "config.env.example" ]; then
        cp config.env.example .env
        echo -e "${YELLOW}📝 Please edit .env file with your configuration before running again.${NC}"
        exit 1
    else
        echo -e "${RED}❌ No .env template found. Please create .env file manually.${NC}"
        exit 1
    fi
fi

# Stop existing containers
echo -e "${BLUE}🛑 Stopping existing containers...${NC}"
docker compose down || true

# Pull latest images
echo -e "${BLUE}📥 Pulling latest images...${NC}"
docker compose pull

# Build images if needed
echo -e "${BLUE}🔨 Building images...${NC}"
docker compose build --no-cache

# Start services
echo -e "${BLUE}🚀 Starting services...${NC}"
docker compose up -d

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Check service health
echo -e "${BLUE}🔍 Checking service health...${NC}"

# Check backend health
if curl -f http://localhost:3104/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    docker-compose logs backend
    exit 1
fi

# Check frontend health
if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
    docker-compose logs frontend
    exit 1
fi

# Show running containers
echo -e "${BLUE}📋 Running containers:${NC}"
docker compose ps

# Clean up unused images
echo -e "${BLUE}🧹 Cleaning up unused Docker images...${NC}"
docker image prune -f

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}📊 Application URLs:${NC}"
echo -e "   Frontend: http://localhost"
echo -e "   Backend API: http://localhost:3104"
echo -e "   Health Check: http://localhost:3104/health"
echo -e "   Database: localhost:3306 (main), localhost:3307 (default_itemvalue)"
echo ""
echo -e "${BLUE}📝 Useful commands:${NC}"
echo -e "   View logs: docker compose logs -f"
echo -e "   Stop services: docker compose down"
echo -e "   Restart services: docker compose restart"
echo -e "   Update services: ./deploy.sh"
