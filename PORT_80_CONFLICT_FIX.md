# Port 80 Conflict Fix Guide

คู่มือแก้ไขปัญหา port 80 conflict เมื่อ deploy frontend

## 🚨 ปัญหาที่พบ

```
Error starting userland proxy: listen tcp4 0.0.0.0:80: bind: address already in use
```

**สาเหตุ**: Port 80 ถูกใช้งานโดย web server อื่น (Apache, Nginx, หรือ web service อื่น)

## 🔧 วิธีแก้ไข

### วิธีที่ 1: เปลี่ยน port ใน docker-compose.yml (แนะนำ)

```bash
nano docker-compose.yml
```

เปลี่ยน port mapping สำหรับ frontend:

```yaml
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
      - "8080:80"  # เปลี่ยนจาก 80 เป็น 8080
      - "8443:443"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80/"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### วิธีที่ 2: หยุด web server ที่รันอยู่

```bash
# ตรวจสอบ process ที่ใช้ port 80
sudo lsof -i :80
sudo netstat -tlnp | grep :80

# หยุด Apache
sudo systemctl stop apache2
sudo systemctl disable apache2

# หรือหยุด Nginx
sudo systemctl stop nginx
sudo systemctl disable nginx

# หรือหยุด process ที่ใช้ port
sudo kill -9 PID
```

### วิธีที่ 3: ใช้ port อื่น

```bash
# เปลี่ยนเป็น port 8080
ports:
  - "8080:80"

# หรือ port 3000
ports:
  - "3000:80"

# หรือ port 9000
ports:
  - "9000:80"
```

## 🎯 คำสั่งที่แนะนำสำหรับกรณีนี้

```bash
# 1. หยุด containers ที่รันอยู่
docker compose down

# 2. แก้ไข docker-compose.yml เปลี่ยน port เป็น 8080
nano docker-compose.yml

# 3. เริ่มระบบใหม่
docker compose up -d

# 4. ตรวจสอบสถานะ
docker compose ps
```

## 🔍 ตรวจสอบ port ที่ใช้งาน

```bash
# ดู port ที่เปิดใช้งาน
sudo netstat -tlnp | grep :80
sudo ss -tlnp | grep :80

# ดู process ที่ใช้ port
sudo lsof -i :80

# ดู web services ที่รันอยู่
sudo systemctl status apache2
sudo systemctl status nginx
```

## 📊 Port Mapping ใหม่

| Service | Internal Port | External Port | URL |
|---------|---------------|---------------|-----|
| Frontend | 80 | 8080 | http://your-server-ip:8080 |
| Backend API | 3104 | 3104 | http://your-server-ip:3104 |

## 🔄 การเข้าถึงระบบ

หลังแก้ไขแล้ว:
- **Frontend**: http://your-server-ip:8080
- **Backend API**: http://your-server-ip:3104
- **Health Check**: http://your-server-ip:3104/health

## 🧹 ทำความสะอาด Orphan Containers

```bash
# ลบ orphan containers (MySQL containers เก่า)
docker compose down --remove-orphans

# หรือลบ containers ที่ไม่ใช้
docker container prune -f
```

## 📝 หมายเหตุ

- Port 80 เป็น standard port สำหรับ web server
- Apache, Nginx, หรือ web services อื่นอาจรันอยู่
- ใช้ port 8080 เป็นทางเลือกที่ปลอดภัย
- ระบบจะทำงานได้ปกติบน port ใหม่

## ✅ หลังแก้ไขแล้ว

```bash
# ตรวจสอบสถานะ
docker compose ps

# ดู logs
docker compose logs -f

# ทดสอบ health check
curl http://localhost:3104/health
curl http://localhost:8080
```
