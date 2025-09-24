# Frontend Troubleshooting Guide

คู่มือแก้ไขปัญหา frontend container ที่ restart

## 🚨 ปัญหาที่พบ

```
cost_calculation_frontend   Restarting (1) Less than a second ago
```

**สาเหตุ**: Frontend container มีปัญหาและ restart อยู่

## 🔍 การตรวจสอบ

### 1. ดู logs ของ frontend container

```bash
# ดู logs ของ frontend
docker compose logs frontend

# ดู logs แบบ real-time
docker compose logs -f frontend

# ดู logs ล่าสุด
docker compose logs --tail=50 frontend
```

### 2. ตรวจสอบสถานะ containers

```bash
# ดูสถานะ containers
docker compose ps

# ดูสถานะแบบละเอียด
docker compose ps -a
```

### 3. เข้าไปใน container เพื่อ debug

```bash
# เข้าไปใน frontend container
docker exec -it cost_calculation_frontend sh

# หรือใช้ bash (ถ้ามี)
docker exec -it cost_calculation_frontend bash
```

## 🔧 วิธีแก้ไขที่พบบ่อย

### 1. ปัญหา Nginx Configuration

```bash
# ตรวจสอบ nginx config
docker exec -it cost_calculation_frontend cat /etc/nginx/conf.d/default.conf

# ทดสอบ nginx config
docker exec -it cost_calculation_frontend nginx -t
```

### 2. ปัญหา Build Files

```bash
# ตรวจสอบไฟล์ที่ build
docker exec -it cost_calculation_frontend ls -la /usr/share/nginx/html

# ตรวจสอบ index.html
docker exec -it cost_calculation_frontend cat /usr/share/nginx/html/index.html
```

### 3. ปัญหา Port Binding

```bash
# ตรวจสอบ port ที่ใช้
docker port cost_calculation_frontend

# ตรวจสอบ process ใน container
docker exec -it cost_calculation_frontend ps aux
```

## 🚀 การแก้ไขปัญหา

### 1. Rebuild Frontend

```bash
# หยุด containers
docker compose down

# Rebuild frontend
docker compose build frontend --no-cache

# เริ่มใหม่
docker compose up -d
```

### 2. ตรวจสอบ Frontend Dockerfile

```bash
# ดู frontend Dockerfile
cat frontend/Dockerfile

# ตรวจสอบ nginx config
cat frontend/nginx.conf
```

### 3. ทดสอบ Build แยก

```bash
# Build frontend แยก
cd frontend
docker build -t test-frontend .

# ทดสอบ run
docker run -p 3014:80 test-frontend
```

## 📝 การแก้ไขที่อาจต้องทำ

### 1. แก้ไข frontend/nginx.conf

```bash
nano frontend/nginx.conf
```

ตรวจสอบว่า config ถูกต้อง:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:3104;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. แก้ไข frontend/Dockerfile

```bash
nano frontend/Dockerfile
```

ตรวจสอบว่า build process ถูกต้อง

## 🔍 การ Debug แบบละเอียด

### 1. ดู logs ทั้งหมด

```bash
# ดู logs ของทุก services
docker compose logs

# ดู logs แบบ real-time
docker compose logs -f

# ดู logs เฉพาะ frontend
docker compose logs frontend
```

### 2. ตรวจสอบ System Resources

```bash
# ดู memory usage
free -h

# ดู disk space
df -h

# ดู Docker stats
docker stats
```

### 3. ตรวจสอบ Network

```bash
# ดู network
docker network ls

# ดู network details
docker network inspect cost-calculation-system_app_network
```

## 📊 การตรวจสอบหลังแก้ไข

```bash
# ตรวจสอบสถานะ
docker compose ps

# ทดสอบ health check
curl http://localhost:3014

# ทดสอบ backend
curl http://localhost:3104/health
```

## 🚨 สาเหตุที่พบบ่อย

1. **Nginx config ผิด**: Configuration file มีปัญหา
2. **Build files หาย**: ไฟล์ที่ build ไม่ถูกต้อง
3. **Port conflict**: Port ถูกใช้งาน
4. **Memory insufficient**: หน่วยความจำไม่เพียงพอ
5. **Network issues**: ปัญหา network connectivity

## 💡 Tips

- ใช้ `docker compose logs -f` เพื่อดู logs แบบ real-time
- ใช้ `--no-cache` เมื่อ rebuild images
- ตรวจสอบ nginx config ก่อน
- ดู system resources ถ้า container restart บ่อย
