# Port Conflict Fix Guide

คู่มือแก้ไขปัญหา port conflict เมื่อ deploy ระบบ

## 🚨 ปัญหาที่พบ

```
Error starting userland proxy: listen tcp4 0.0.0.0:3306: bind: address already in use
```

**สาเหตุ**: Port 3306 (MySQL) ถูกใช้งานโดย service อื่นอยู่แล้ว

## 🔧 วิธีแก้ไข

### วิธีที่ 1: หยุด MySQL service ที่รันอยู่ (แนะนำ)

```bash
# ดู process ที่ใช้ port 3306
sudo lsof -i :3306

# หยุด MySQL service
sudo systemctl stop mysql
sudo systemctl stop mysqld

# หรือหยุด MariaDB
sudo systemctl stop mariadb

# ปิดไม่ให้ start อัตโนมัติ
sudo systemctl disable mysql
sudo systemctl disable mysqld
sudo systemctl disable mariadb
```

### วิธีที่ 2: เปลี่ยน port ใน docker-compose.yml

```bash
# แก้ไข docker-compose.yml
nano docker-compose.yml
```

เปลี่ยน port mapping:
```yaml
ports:
  - "3307:3306"  # เปลี่ยนจาก 3306 เป็น 3307
```

และ
```yaml
ports:
  - "3308:3306"  # เปลี่ยนจาก 3307 เป็น 3308
```

### วิธีที่ 3: ใช้ Docker network แทน port mapping

```bash
# แก้ไข docker-compose.yml
nano docker-compose.yml
```

ลบ port mapping สำหรับ MySQL:
```yaml
# ลบบรรทัดเหล่านี้
# ports:
#   - "3306:3306"
#   - "3307:3306"
```

## 🎯 คำสั่งที่แนะนำสำหรับกรณีนี้

```bash
# 1. หยุด MySQL service ที่รันอยู่
sudo systemctl stop mysql
sudo systemctl stop mysqld
sudo systemctl stop mariadb

# 2. ปิดไม่ให้ start อัตโนมัติ
sudo systemctl disable mysql
sudo systemctl disable mysqld
sudo systemctl disable mariadb

# 3. หยุด containers ที่รันอยู่
docker compose down

# 4. เริ่มระบบใหม่
docker compose up -d
```

## 🔍 ตรวจสอบ port ที่ใช้งาน

```bash
# ดู port ที่เปิดใช้งาน
sudo netstat -tlnp | grep :3306
sudo ss -tlnp | grep :3306

# ดู process ที่ใช้ port
sudo lsof -i :3306
```

## 📝 หมายเหตุ

- Docker containers จะใช้ MySQL ภายใน container network
- ไม่จำเป็นต้อง expose port 3306 ไปยัง host (ยกเว้นต้องการเข้าถึงจากภายนอก)
- ระบบจะเข้าถึง MySQL ผ่าน Docker network

## ✅ หลังแก้ไขแล้ว

```bash
# ตรวจสอบสถานะ
docker compose ps

# ดู logs
docker compose logs -f

# ทดสอบ health check
curl http://localhost:3104/health
curl http://localhost:80
```
