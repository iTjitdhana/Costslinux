# Frontend Port Fix Guide

คู่มือแก้ไข port สำหรับ frontend ให้ถูกต้อง

## 🎯 สถานการณ์

- Frontend รันที่ port 3014 (ไม่ใช่ 80)
- ต้องแก้ไข docker-compose.yml ให้ถูกต้อง
- ต้องแก้ไข CORS origin ให้ตรงกับ port

## 🔧 การแก้ไขที่ทำแล้ว

### 1. แก้ไข docker-compose.yml

```yaml
# Frontend
frontend:
  ports:
    - "3014:80"  # Frontend runs on port 3014
    - "443:443"
```

### 2. แก้ไข CORS Origin

```yaml
backend:
  environment:
    CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:3014}
```

## 🚀 การ Deploy

```bash
# 1. หยุด containers เดิม
docker compose down

# 2. ลบ orphan containers (MySQL containers เก่า)
docker compose down --remove-orphans

# 3. เริ่มระบบใหม่
docker compose up -d

# 4. ตรวจสอบสถานะ
docker compose ps
```

## 📊 Port Mapping ที่ถูกต้อง

| Service | Internal Port | External Port | URL |
|---------|---------------|---------------|-----|
| Frontend | 80 | 3014 | http://your-server-ip:3014 |
| Backend API | 3104 | 3104 | http://your-server-ip:3104 |

## 🔍 ตรวจสอบการทำงาน

```bash
# ตรวจสอบสถานะ
docker compose ps

# ดู logs
docker compose logs -f

# ทดสอบ health check
curl http://localhost:3104/health

# ทดสอบ frontend
curl http://localhost:3014
```

## 🌐 การเข้าถึงระบบ

- **Frontend**: http://your-server-ip:3014
- **Backend API**: http://your-server-ip:3104
- **Health Check**: http://your-server-ip:3104/health

## 📝 หมายเหตุ

- Frontend รันที่ port 3014 ตามที่กำหนดใน package.json
- Backend รันที่ port 3104
- CORS origin ต้องตรงกับ frontend port
- ไม่มี port conflict เพราะใช้ port 3014 แทน 80

## ✅ ข้อดี

- ✅ ไม่มี port conflict กับ Apache/Nginx
- ✅ ใช้ port ที่ถูกต้องตาม configuration
- ✅ CORS ทำงานได้ปกติ
- ✅ ระบบทำงานได้ตามที่คาดหวัง
