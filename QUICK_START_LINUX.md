# Quick Start Guide - Linux Server

คู่มือเริ่มต้นใช้งานอย่างรวดเร็วบน Linux Server

## 🚀 ขั้นตอนด่วน (5 นาที)

### 1. เชื่อมต่อ Server
```bash
ssh username@your-server-ip
```

### 2. Clone และ Setup
```bash
# สร้าง directory และ clone
sudo mkdir -p /opt/cost-calculation-system
sudo chown $USER:$USER /opt/cost-calculation-system
cd /opt/cost-calculation-system
git clone https://github.com/iTjitdhana/Costslinux.git .
```

### 3. ตั้งค่า Environment
```bash
# Copy และแก้ไข config
cp env.example .env
nano .env
```

**เปลี่ยนค่าเหล่านี้ใน `.env`:**
```bash
DB_PASSWORD=my_secure_password_123
MYSQL_ROOT_PASSWORD=root_password_456
DEFAULT_ITEM_DB_PASSWORD=my_secure_password_123
```

### 4. Deploy ระบบ
```bash
# ให้สิทธิ์และรัน deployment
chmod +x deploy.sh
./deploy.sh
```

### 5. เปิด Firewall
```bash
# Ubuntu/Debian
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3104
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3104/tcp
sudo firewall-cmd --reload
```

### 6. เข้าถึงระบบ
- **Frontend**: http://your-server-ip
- **Backend API**: http://your-server-ip:3104
- **Health Check**: http://your-server-ip:3104/health

## 🔧 คำสั่งที่ใช้บ่อย

### ตรวจสอบสถานะ
```bash
# ดู containers
docker-compose ps

# ดู logs
docker-compose logs -f

# ตรวจสอบ resources
htop
```

### การจัดการ Services
```bash
# หยุดระบบ
docker-compose down

# เริ่มระบบ
docker-compose up -d

# Restart
docker-compose restart

# อัพเดท
git pull origin main
docker-compose up -d --build
```

### การสร้างไฟล์
```bash
# สร้างไฟล์ใหม่
nano filename.txt

# แก้ไขไฟล์
nano existing-file.txt

# ดูเนื้อหาไฟล์
cat filename.txt
```

## 🚨 การแก้ไขปัญหาด่วน

### Container ไม่ Start
```bash
docker-compose logs service_name
docker-compose down
docker-compose up -d --build
```

### Port ถูกใช้งาน
```bash
sudo lsof -i :80
sudo kill -9 PID
```

### Permission Error
```bash
sudo chown -R $USER:$USER /opt/cost-calculation-system
chmod +x deploy.sh
```

## 📊 ตรวจสอบสุขภาพระบบ

```bash
# ตรวจสอบ API
curl http://localhost:3104/health

# ตรวจสอบ Frontend
curl http://localhost:80

# ตรวจสอบ Database
docker exec cost_calculation_mysql mysql -u root -p -e "SHOW DATABASES;"
```

## 🔄 การ Backup ง่ายๆ

```bash
# Backup database
docker exec cost_calculation_mysql mysqldump -u root -p esp_tracker > backup_$(date +%Y%m%d).sql

# Backup config
tar -czf config_backup_$(date +%Y%m%d).tar.gz .env docker-compose.yml
```

---

**🎉 เสร็จแล้ว!** ระบบพร้อมใช้งานแล้ว

หากมีปัญหา ดู `LINUX_SERVER_GUIDE.md` สำหรับคำแนะนำแบบละเอียด
