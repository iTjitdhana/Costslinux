# Linux Server Fixes

การแก้ไขปัญหาที่พบบน Linux Server

## 🚨 ปัญหาที่พบ

### 1. Docker Compose Command Not Found
**ปัญหา**: `docker-compose: command not found`

**สาเหตุ**: Docker Compose เวอร์ชันใหม่ใช้ `docker compose` (มี space) แทน `docker-compose` (มี hyphen)

**วิธีแก้**:
```bash
# ใช้คำสั่งใหม่
docker compose up -d --build

# แทนที่จะใช้
docker-compose up -d --build
```

### 2. Missing Scripts Folder
**ปัญหา**: `"/scripts": not found` ใน Dockerfile

**สาเหตุ**: Dockerfile พยายาม copy folder `scripts/` ที่ไม่มี

**วิธีแก้**: แก้ไข Dockerfile แล้ว (ไม่ต้อง copy scripts folder)

## ✅ การแก้ไขที่ทำแล้ว

### 1. แก้ไข Dockerfile
- ลบการ copy `scripts/` folder
- เปลี่ยน `COPY config.env ./` เป็น `COPY config.env* ./` (optional)

### 2. แก้ไข Deploy Scripts
- เปลี่ยน `docker-compose` เป็น `docker compose` ใน:
  - `deploy.sh`
  - `deploy.bat`

### 3. แก้ไข docker-compose.yml
- ลบ `version: '3.8'` (ไม่จำเป็นใน Docker Compose v2)

## 🚀 คำสั่งที่ถูกต้องสำหรับ Linux Server

### การ Clone และ Setup
```bash
# Clone repository
git clone https://github.com/iTjitdhana/Costslinux.git
cd Costslinux

# Copy environment
cp env.example .env

# แก้ไข .env file
nano .env
```

### การ Deploy
```bash
# ให้สิทธิ์ execute
chmod +x deploy.sh
chmod +x test-build.sh

# ทดสอบ build
./test-build.sh

# Deploy ระบบ
./deploy.sh
```

### คำสั่ง Docker ที่ถูกต้อง
```bash
# เริ่มระบบ
docker compose up -d

# ดูสถานะ
docker compose ps

# ดู logs
docker compose logs -f

# หยุดระบบ
docker compose down

# Build ใหม่
docker compose build --no-cache

# Pull images ใหม่
docker compose pull
```

## 🔧 การแก้ไขปัญหาที่อาจพบ

### 1. Permission Denied
```bash
sudo chown -R $USER:$USER /opt/cost-calculation-system
chmod +x *.sh
```

### 2. Port Already in Use
```bash
# ดู process ที่ใช้ port
sudo lsof -i :80
sudo lsof -i :3104

# หยุด process
sudo kill -9 PID
```

### 3. Database Connection Error
```bash
# ตรวจสอบ database
docker compose logs mysql

# เข้าไปใน database
docker exec -it cost_calculation_mysql mysql -u root -p
```

### 4. Frontend Build Error
```bash
# ลบ node_modules และ build ใหม่
docker compose build frontend --no-cache
```

## 📝 Environment Variables ที่ต้องตั้งค่า

ในไฟล์ `.env`:
```bash
# Database passwords (เปลี่ยนเป็นรหัสผ่านที่แข็งแรง)
DB_PASSWORD=your_secure_password_here
MYSQL_ROOT_PASSWORD=root_secure_password_here
DEFAULT_ITEM_DB_PASSWORD=your_secure_password_here

# CORS (เปลี่ยนเป็น IP หรือ domain ของ server)
CORS_ORIGIN=http://your-server-ip,https://yourdomain.com

# Environment
NODE_ENV=production
```

## 🧪 การทดสอบระบบ

### 1. ทดสอบ Build
```bash
./test-build.sh
```

### 2. ทดสอบ Health Check
```bash
# Backend
curl http://localhost:3104/health

# Frontend
curl http://localhost:80

# Database
docker exec cost_calculation_mysql mysql -u root -p -e "SHOW DATABASES;"
```

### 3. ทดสอบ API
```bash
# Test API endpoints
curl http://localhost:3104/
curl http://localhost:3104/api/batches
```

## 🔄 การอัพเดทระบบ

```bash
# Pull latest code
git pull origin main

# Rebuild และ restart
docker compose down
docker compose up -d --build
```

## 📊 การ Monitor ระบบ

```bash
# ดูสถานะ containers
docker compose ps

# ดู logs
docker compose logs -f

# ดู resources
docker stats

# ดู disk usage
df -h
```

---

**หมายเหตุ**: หลังจากแก้ไขแล้ว ระบบควรทำงานได้ปกติบน Linux server แล้ว
