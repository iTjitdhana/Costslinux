# Shared Database Setup Guide

คู่มือการตั้งค่าระบบให้ใช้ database เดียวกันกับระบบอื่น

## 🎯 สถานการณ์

- มีอีกระบบรันอยู่ที่ใช้ database เดียวกัน
- ต้องการรันระบบใหม่โดยใช้ database เดียวกัน
- ต้องแยก port และ container names

## 🔧 วิธีแก้ไข

### 1. แก้ไข docker-compose.yml

```bash
nano docker-compose.yml
```

เปลี่ยนการตั้งค่าเป็น:

```yaml
services:
  # MySQL Database - ใช้ database เดียวกัน
  mysql:
    image: mysql:8.0
    container_name: cost_calculation_mysql_new  # เปลี่ยนชื่อ container
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpassword}
      MYSQL_DATABASE: ${DB_NAME:-esp_tracker}
      MYSQL_USER: ${DB_USER:-app_user}
      MYSQL_PASSWORD: ${DB_PASSWORD:-app_password}
    volumes:
      - mysql_data_new:/var/lib/mysql  # เปลี่ยนชื่อ volume
      - ./database:/docker-entrypoint-initdb.d
    ports:
      - "3308:3306"  # เปลี่ยน port เป็น 3308
    networks:
      - app_network
    command: --default-authentication-plugin=mysql_native_password
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD:-rootpassword}"]
      timeout: 20s
      retries: 10

  # Default Item Value Database
  mysql_default:
    image: mysql:8.0
    container_name: cost_calculation_mysql_default_new  # เปลี่ยนชื่อ container
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpassword}
      MYSQL_DATABASE: ${DEFAULT_ITEM_DB_NAME:-default_itemvalue}
      MYSQL_USER: ${DB_USER:-app_user}
      MYSQL_PASSWORD: ${DB_PASSWORD:-app_password}
    volumes:
      - mysql_default_data_new:/var/lib/mysql  # เปลี่ยนชื่อ volume
      - ./database:/docker-entrypoint-initdb.d
    ports:
      - "3309:3306"  # เปลี่ยน port เป็น 3309
    networks:
      - app_network
    command: --default-authentication-plugin=mysql_native_password
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD:-rootpassword}"]
      timeout: 20s
      retries: 10

  # Backend API
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: cost_calculation_backend_new  # เปลี่ยนชื่อ container
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: 3104
      DB_HOST: mysql
      DB_PORT: 3306
      DB_NAME: ${DB_NAME:-esp_tracker}
      DB_USER: ${DB_USER:-app_user}
      DB_PASSWORD: ${DB_PASSWORD:-app_password}
      DEFAULT_ITEM_DB_HOST: mysql_default
      DEFAULT_ITEM_DB_PORT: 3306
      DEFAULT_ITEM_DB_NAME: ${DEFAULT_ITEM_DB_NAME:-default_itemvalue}
      DEFAULT_ITEM_DB_USER: ${DB_USER:-app_user}
      DEFAULT_ITEM_DB_PASSWORD: ${DB_PASSWORD:-app_password}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost}
      RATE_LIMIT_WINDOW_MS: ${RATE_LIMIT_WINDOW_MS:-60000}
      RATE_LIMIT_MAX_REQUESTS: ${RATE_LIMIT_MAX_REQUESTS:-1000}
    depends_on:
      mysql:
        condition: service_healthy
      mysql_default:
        condition: service_healthy
    networks:
      - app_network
    ports:
      - "3105:3104"  # เปลี่ยน port เป็น 3105
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3104/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: cost_calculation_frontend_new  # เปลี่ยนชื่อ container
    restart: unless-stopped
    depends_on:
      - backend
    networks:
      - app_network
    ports:
      - "8080:80"  # เปลี่ยน port เป็น 8080
      - "8443:443"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80/"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  mysql_data_new:  # เปลี่ยนชื่อ volume
    driver: local
  mysql_default_data_new:  # เปลี่ยนชื่อ volume
    driver: local

networks:
  app_network:
    driver: bridge
```

### 2. แก้ไข .env file

```bash
nano .env
```

เปลี่ยนค่า:

```bash
# Backend port
PORT=3104

# Database ports (สำหรับ external access)
DB_HOST=mysql
DB_PORT=3306
DEFAULT_ITEM_DB_HOST=mysql_default
DEFAULT_ITEM_DB_PORT=3306

# CORS - เพิ่ม port ใหม่
CORS_ORIGIN=http://localhost:8080,http://your-server-ip:8080
```

### 3. แก้ไข frontend/nginx.conf

```bash
nano frontend/nginx.conf
```

เปลี่ยน proxy_pass:

```nginx
# API proxy to backend
location /api/ {
    proxy_pass http://backend:3104;  # ใช้ internal port
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Health check endpoint
location /health {
    proxy_pass http://backend:3104;  # ใช้ internal port
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 🚀 การ Deploy

```bash
# 1. หยุด containers เดิม (ถ้ามี)
docker compose down

# 2. เริ่มระบบใหม่
docker compose up -d --build

# 3. ตรวจสอบสถานะ
docker compose ps
```

## 📊 Port Mapping ใหม่

| Service | Internal Port | External Port | URL |
|---------|---------------|---------------|-----|
| Frontend | 80 | 8080 | http://your-server-ip:8080 |
| Backend API | 3104 | 3105 | http://your-server-ip:3105 |
| MySQL Main | 3306 | 3308 | your-server-ip:3308 |
| MySQL Default | 3306 | 3309 | your-server-ip:3309 |

## 🔍 การเข้าถึงระบบ

- **Frontend**: http://your-server-ip:8080
- **Backend API**: http://your-server-ip:3105
- **Health Check**: http://your-server-ip:3105/health

## 🗄️ การใช้ Database เดียวกัน

### วิธีที่ 1: ใช้ Database เดียวกันแต่แยก Tables

```bash
# เข้าไปใน database
docker exec -it cost_calculation_mysql_new mysql -u root -p

# สร้าง tables สำหรับระบบใหม่
USE esp_tracker;
CREATE TABLE IF NOT EXISTS new_system_table (...);
```

### วิธีที่ 2: ใช้ Database เดียวกันแต่แยก Databases

```bash
# เข้าไปใน database
docker exec -it cost_calculation_mysql_new mysql -u root -p

# สร้าง database ใหม่
CREATE DATABASE new_system_db;
USE new_system_db;
```

## 🔧 การแก้ไขปัญหาที่อาจพบ

### 1. Container Name Conflict

```bash
# ดู containers ที่รันอยู่
docker ps -a

# หยุด containers ที่ขัดแย้ง
docker stop container_name
docker rm container_name
```

### 2. Volume Conflict

```bash
# ดู volumes
docker volume ls

# ลบ volumes เก่า (ระวัง: จะลบข้อมูล)
docker volume rm volume_name
```

### 3. Network Conflict

```bash
# ดู networks
docker network ls

# ลบ network เก่า
docker network rm network_name
```

## 📝 หมายเหตุ

- ระบบเก่าและใหม่จะรันแยกกัน
- ใช้ database เดียวกันแต่แยก port
- ข้อมูลจะไม่ขัดแย้งกัน
- สามารถเข้าถึงได้จาก port ที่ต่างกัน
