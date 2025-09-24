# External MySQL Setup Guide

คู่มือการตั้งค่าระบบให้ใช้ MySQL ที่ติดตั้งอยู่บน Linux server

## 🎯 สถานการณ์

- ใช้ MySQL ที่ติดตั้งอยู่บน Linux server แล้ว
- ไม่ต้องการใช้ Docker MySQL containers
- ต้องการใช้ database เดียวกันกับระบบอื่น

## 🔧 วิธีแก้ไข

### 1. แก้ไข docker-compose.yml

```bash
nano docker-compose.yml
```

ลบ MySQL services ออกและแก้ไขเป็น:

```yaml
# Docker Compose version 2.x format

services:
  # Backend API
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: cost_calculation_backend
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: 3104
      DB_HOST: host.docker.internal  # ใช้ host MySQL
      DB_PORT: 3306
      DB_NAME: ${DB_NAME:-esp_tracker}
      DB_USER: ${DB_USER:-app_user}
      DB_PASSWORD: ${DB_PASSWORD:-app_password}
      DEFAULT_ITEM_DB_HOST: host.docker.internal  # ใช้ host MySQL
      DEFAULT_ITEM_DB_PORT: 3306
      DEFAULT_ITEM_DB_NAME: ${DEFAULT_ITEM_DB_NAME:-default_itemvalue}
      DEFAULT_ITEM_DB_USER: ${DB_USER:-app_user}
      DEFAULT_ITEM_DB_PASSWORD: ${DB_PASSWORD:-app_password}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost}
      RATE_LIMIT_WINDOW_MS: ${RATE_LIMIT_WINDOW_MS:-60000}
      RATE_LIMIT_MAX_REQUESTS: ${RATE_LIMIT_MAX_REQUESTS:-1000}
    networks:
      - app_network
    ports:
      - "3104:3104"
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
    container_name: cost_calculation_frontend
    restart: unless-stopped
    depends_on:
      - backend
    networks:
      - app_network
    ports:
      - "80:80"
      - "443:443"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80/"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  app_network:
    driver: bridge
```

### 2. แก้ไข .env file

```bash
nano .env
```

ตั้งค่าให้ใช้ host MySQL:

```bash
# Backend Configuration
PORT=3104

# Main Database Configuration - ใช้ host MySQL
DB_HOST=host.docker.internal
DB_PORT=3306
DB_NAME=esp_tracker
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password

# Default Item Value Database Configuration - ใช้ host MySQL
DEFAULT_ITEM_DB_HOST=host.docker.internal
DEFAULT_ITEM_DB_PORT=3306
DEFAULT_ITEM_DB_NAME=default_itemvalue
DEFAULT_ITEM_DB_USER=your_mysql_user
DEFAULT_ITEM_DB_PASSWORD=your_mysql_password

# CORS Configuration
CORS_ORIGIN=http://localhost,https://yourdomain.com

# Environment
NODE_ENV=production
```

### 3. ตั้งค่า MySQL ให้รองรับ Docker

#### ตรวจสอบ MySQL configuration:

```bash
# ดู MySQL config
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

เพิ่มหรือแก้ไข:

```ini
[mysqld]
bind-address = 0.0.0.0  # อนุญาตให้ connect จากภายนอก
port = 3306
```

#### Restart MySQL:

```bash
sudo systemctl restart mysql
```

#### ตรวจสอบ MySQL status:

```bash
sudo systemctl status mysql
```

### 4. สร้าง User สำหรับ Docker (ถ้าจำเป็น)

```bash
# เข้าไปใน MySQL
mysql -u root -p

# สร้าง user สำหรับ Docker
CREATE USER 'docker_user'@'%' IDENTIFIED BY 'docker_password';
GRANT ALL PRIVILEGES ON esp_tracker.* TO 'docker_user'@'%';
GRANT ALL PRIVILEGES ON default_itemvalue.* TO 'docker_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

### 5. ตั้งค่า Firewall

```bash
# เปิด port 3306 สำหรับ Docker
sudo ufw allow 3306

# หรือเปิดเฉพาะ Docker network
sudo ufw allow from 172.17.0.0/16 to any port 3306
```

## 🚀 การ Deploy

```bash
# 1. หยุด containers เดิม
docker compose down

# 2. เริ่มระบบใหม่
docker compose up -d --build

# 3. ตรวจสอบสถานะ
docker compose ps

# 4. ดู logs
docker compose logs -f backend
```

## 🔍 ตรวจสอบการเชื่อมต่อ

### 1. ตรวจสอบ MySQL connection:

```bash
# ทดสอบเชื่อมต่อ MySQL จาก host
mysql -h localhost -u your_mysql_user -p

# ทดสอบเชื่อมต่อจาก Docker container
docker exec -it cost_calculation_backend mysql -h host.docker.internal -u your_mysql_user -p
```

### 2. ตรวจสอบ Backend logs:

```bash
docker compose logs backend
```

### 3. ทดสอบ Health Check:

```bash
curl http://localhost:3104/health
```

## 🔧 การแก้ไขปัญหาที่อาจพบ

### 1. Connection Refused

```bash
# ตรวจสอบ MySQL status
sudo systemctl status mysql

# ตรวจสอบ MySQL config
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# ตรวจสอบ port
sudo netstat -tlnp | grep :3306
```

### 2. Access Denied

```bash
# ตรวจสอบ user permissions
mysql -u root -p
SELECT user, host FROM mysql.user;
SHOW GRANTS FOR 'docker_user'@'%';
```

### 3. Firewall Issues

```bash
# เปิด port 3306
sudo ufw allow 3306

# ตรวจสอบ firewall status
sudo ufw status
```

## 📊 ข้อดีของการใช้ External MySQL

- ✅ ใช้ database เดียวกันกับระบบอื่น
- ✅ ไม่ต้องจัดการ MySQL containers
- ✅ ประหยัด resources
- ✅ ง่ายต่อการ backup และ maintenance
- ✅ ไม่มี port conflicts

## 📝 หมายเหตุ

- `host.docker.internal` เป็น hostname พิเศษที่ Docker ใช้เข้าถึง host machine
- ต้องตั้งค่า MySQL ให้รองรับการเชื่อมต่อจากภายนอก
- ต้องตั้งค่า firewall ให้เปิด port 3306
