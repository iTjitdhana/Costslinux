# Linux Server Setup Guide

คู่มือการติดตั้งและใช้งาน Cost Calculation System บน Linux Server

## 📋 สิ่งที่ต้องเตรียม

### 1. Server Requirements
- **OS**: Ubuntu 20.04+ หรือ CentOS 8+
- **RAM**: อย่างน้อย 4GB (แนะนำ 8GB+)
- **Storage**: อย่างน้อย 20GB (แนะนำ 50GB+)
- **Network**: Port 80, 443, 22 เปิดใช้งาน
- **Docker**: ติดตั้งแล้ว ✅
- **Docker Compose**: ติดตั้งแล้ว ✅

## 🚀 ขั้นตอนการติดตั้ง

### ขั้นตอนที่ 1: เชื่อมต่อ Server

```bash
# เชื่อมต่อผ่าน SSH
ssh username@your-server-ip

# หรือใช้ IP address
ssh root@192.168.1.100
```

### ขั้นตอนที่ 2: อัพเดทระบบ

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
# หรือ
sudo dnf update -y
```

### ขั้นตอนที่ 3: ติดตั้ง Git (ถ้ายังไม่มี)

```bash
# Ubuntu/Debian
sudo apt install git -y

# CentOS/RHEL
sudo yum install git -y
# หรือ
sudo dnf install git -y
```

### ขั้นตอนที่ 4: Clone Repository

```bash
# สร้าง directory สำหรับโปรเจกต์
sudo mkdir -p /opt/cost-calculation-system
sudo chown $USER:$USER /opt/cost-calculation-system

# เปลี่ยนไปยัง directory
cd /opt/cost-calculation-system

# Clone repository
git clone https://github.com/iTjitdhana/Costslinux.git .

# หรือใช้ SSH (ถ้าตั้งค่า SSH key แล้ว)
git clone git@github.com:iTjitdhana/Costslinux.git .
```

### ขั้นตอนที่ 5: ตั้งค่า Environment

```bash
# Copy environment template
cp env.example .env

# แก้ไข environment variables
nano .env
```

**สิ่งสำคัญที่ต้องเปลี่ยนในไฟล์ `.env`:**

```bash
# เปลี่ยนรหัสผ่านเหล่านี้
DB_PASSWORD=your_secure_password_here
MYSQL_ROOT_PASSWORD=root_secure_password_here
DEFAULT_ITEM_DB_PASSWORD=your_secure_password_here

# เปลี่ยน domain (ถ้ามี)
CORS_ORIGIN=https://yourdomain.com,http://your-server-ip

# ตั้งค่า environment
NODE_ENV=production
```

### ขั้นตอนที่ 6: Deploy ระบบ

```bash
# ให้สิทธิ์ execute กับ deployment script
chmod +x deploy.sh

# รัน deployment
./deploy.sh
```

หรือใช้ Docker Compose โดยตรง:

```bash
# Build และ start services
docker-compose up -d --build

# ตรวจสอบสถานะ
docker-compose ps

# ดู logs
docker-compose logs -f
```

## 📁 การจัดการไฟล์บน Linux

### คำสั่งพื้นฐานสำหรับการสร้างไฟล์

#### 1. การสร้างไฟล์ด้วย `touch`

```bash
# สร้างไฟล์เปล่า
touch filename.txt

# สร้างหลายไฟล์พร้อมกัน
touch file1.txt file2.txt file3.txt

# สร้างไฟล์ใน directory อื่น
touch /path/to/directory/filename.txt
```

#### 2. การสร้างไฟล์ด้วย `nano` (Text Editor)

```bash
# สร้างไฟล์ใหม่และแก้ไข
nano filename.txt

# แก้ไขไฟล์ที่มีอยู่
nano existing-file.txt

# สร้างไฟล์ใน directory อื่น
nano /path/to/directory/filename.txt
```

**วิธีใช้ nano:**
- กด `Ctrl + X` เพื่อออก
- กด `Y` เพื่อบันทึก
- กด `Enter` เพื่อยืนยัน

#### 3. การสร้างไฟล์ด้วย `vim`

```bash
# สร้างไฟล์ใหม่
vim filename.txt

# แก้ไขไฟล์ที่มีอยู่
vim existing-file.txt
```

**วิธีใช้ vim:**
- กด `i` เพื่อเข้าสู่ insert mode
- กด `Esc` เพื่อออกจาก insert mode
- พิมพ์ `:wq` เพื่อบันทึกและออก
- พิมพ์ `:q!` เพื่อออกโดยไม่บันทึก

#### 4. การสร้างไฟล์ด้วย `echo`

```bash
# สร้างไฟล์ที่มีข้อความ
echo "Hello World" > filename.txt

# เพิ่มข้อความต่อท้ายไฟล์
echo "New line" >> filename.txt

# สร้างไฟล์ที่มีหลายบรรทัด
echo -e "Line 1\nLine 2\nLine 3" > filename.txt
```

#### 5. การสร้างไฟล์ด้วย `cat`

```bash
# สร้างไฟล์จาก keyboard input
cat > filename.txt
# พิมพ์ข้อความ
# กด Ctrl + D เพื่อจบ

# สร้างไฟล์ที่มีหลายบรรทัด
cat > filename.txt << EOF
Line 1
Line 2
Line 3
EOF
```

#### 6. การสร้างไฟล์ด้วย `printf`

```bash
# สร้างไฟล์ที่มีข้อความ
printf "Hello World\n" > filename.txt

# สร้างไฟล์ที่มีหลายบรรทัด
printf "Line 1\nLine 2\nLine 3\n" > filename.txt
```

### การสร้าง Directory

```bash
# สร้าง directory เดียว
mkdir directory_name

# สร้างหลาย directory พร้อมกัน
mkdir dir1 dir2 dir3

# สร้าง directory แบบ recursive
mkdir -p path/to/directory

# สร้าง directory พร้อมตั้งสิทธิ์
mkdir -m 755 directory_name
```

### การจัดการไฟล์และ Directory

```bash
# ดูเนื้อหาใน directory
ls -la

# เปลี่ยน directory
cd directory_name
cd /absolute/path
cd ..  # กลับไป directory ก่อนหน้า

# คัดลอกไฟล์
cp source.txt destination.txt
cp -r source_dir destination_dir

# ย้ายไฟล์
mv old_name.txt new_name.txt
mv file.txt /path/to/destination/

# ลบไฟล์
rm filename.txt
rm -rf directory_name  # ลบ directory และเนื้อหาทั้งหมด

# ดูเนื้อหาไฟล์
cat filename.txt
less filename.txt
head filename.txt
tail filename.txt

# แก้ไขสิทธิ์ไฟล์
chmod 755 filename.txt
chmod +x script.sh
```

## 🔧 การจัดการ Docker บน Linux

### คำสั่ง Docker พื้นฐาน

```bash
# ดู Docker images
docker images

# ดู containers ที่รันอยู่
docker ps

# ดู containers ทั้งหมด (รวมที่หยุดแล้ว)
docker ps -a

# ดู logs ของ container
docker logs container_name
docker logs -f container_name  # follow logs

# เข้าไปใน container
docker exec -it container_name bash

# หยุด container
docker stop container_name

# เริ่ม container
docker start container_name

# ลบ container
docker rm container_name

# ลบ image
docker rmi image_name

# Clean up unused resources
docker system prune -f
```

### การใช้ Docker Compose

```bash
# เริ่ม services ทั้งหมด
docker-compose up -d

# หยุด services
docker-compose down

# ดูสถานะ services
docker-compose ps

# ดู logs
docker-compose logs
docker-compose logs -f service_name

# Restart service
docker-compose restart service_name

# Build images ใหม่
docker-compose build

# Pull images ใหม่
docker-compose pull

# Scale service
docker-compose up -d --scale service_name=3
```

## 🌐 การตั้งค่า Network และ Firewall

### การเปิด Port

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw allow 3104    # Backend API
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3104/tcp
sudo firewall-cmd --reload

# หรือปิด firewall ชั่วคราว (ไม่แนะนำสำหรับ production)
sudo systemctl stop firewalld
sudo systemctl disable firewalld
```

### การตรวจสอบ Port

```bash
# ดู port ที่เปิดใช้งาน
sudo netstat -tlnp
sudo ss -tlnp

# ดู port ที่ process ใช้
sudo lsof -i :80
sudo lsof -i :3104
```

## 📊 การ Monitor ระบบ

### ตรวจสอบสถานะ Services

```bash
# ตรวจสอบ Docker services
docker-compose ps

# ตรวจสอบ system resources
htop
top
free -h
df -h

# ตรวจสอบ network
ip addr show
ip route show

# ตรวจสอบ logs
journalctl -f
sudo tail -f /var/log/syslog
```

### การ Backup

```bash
# Backup ฐานข้อมูล
docker exec cost_calculation_mysql mysqldump -u root -p esp_tracker > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup ไฟล์ configuration
tar -czf config_backup_$(date +%Y%m%d_%H%M%S).tar.gz .env docker-compose.yml nginx/

# Backup ทั้งโปรเจกต์
tar -czf project_backup_$(date +%Y%m%d_%H%M%S).tar.gz /opt/cost-calculation-system
```

## 🚨 การแก้ไขปัญหาที่พบบ่อย

### 1. Permission Denied

```bash
# เปลี่ยน owner ของไฟล์
sudo chown -R $USER:$USER /opt/cost-calculation-system

# เปลี่ยนสิทธิ์ไฟล์
chmod +x deploy.sh
chmod 644 .env
```

### 2. Port Already in Use

```bash
# ดู process ที่ใช้ port
sudo lsof -i :80
sudo lsof -i :3104

# หยุด process
sudo kill -9 PID

# หรือเปลี่ยน port ใน docker-compose.yml
```

### 3. Docker Container ไม่ Start

```bash
# ดู logs
docker-compose logs service_name

# ตรวจสอบ configuration
docker-compose config

# Rebuild images
docker-compose build --no-cache
```

### 4. Database Connection Error

```bash
# ตรวจสอบ database status
docker-compose ps mysql

# เข้าไปใน database container
docker exec -it cost_calculation_mysql mysql -u root -p

# ตรวจสอบ database logs
docker-compose logs mysql
```

## 🔄 การอัพเดทระบบ

### การอัพเดท Code

```bash
# Pull latest code
git pull origin main

# Restart services
docker-compose down
docker-compose up -d --build
```

### การอัพเดท Docker Images

```bash
# Pull latest images
docker-compose pull

# Restart services
docker-compose up -d
```

## 📝 การตั้งค่า Cron Jobs

```bash
# แก้ไข crontab
crontab -e

# เพิ่ม jobs
# Backup ทุกวันเวลา 2:00 AM
0 2 * * * cd /opt/cost-calculation-system && docker exec cost_calculation_mysql mysqldump -u root -p esp_tracker > backup_$(date +\%Y\%m\%d).sql

# Clean up logs ทุกสัปดาห์
0 0 * * 0 cd /opt/cost-calculation-system && docker system prune -f
```

## 🔒 Security Best Practices

### 1. ตั้งค่า SSH

```bash
# แก้ไข SSH config
sudo nano /etc/ssh/sshd_config

# เปลี่ยน port SSH
Port 2222

# ปิด root login
PermitRootLogin no

# ใช้ key authentication
PasswordAuthentication no

# Restart SSH
sudo systemctl restart ssh
```

### 2. ตั้งค่า Firewall

```bash
# เปิดเฉพาะ port ที่จำเป็น
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 3104  # ปิด backend port จากภายนอก
```

### 3. ตั้งค่า SSL

```bash
# ติดตั้ง Certbot
sudo apt install certbot python3-certbot-nginx -y

# ได้ SSL certificate
sudo certbot --nginx -d yourdomain.com
```

## 📞 การขอความช่วยเหลือ

### ตรวจสอบสถานะระบบ

```bash
# ตรวจสอบ services
systemctl status docker
systemctl status nginx

# ตรวจสอบ logs
journalctl -u docker
journalctl -u nginx
```

### ข้อมูลสำหรับการขอความช่วยเหลือ

```bash
# รวบรวมข้อมูลระบบ
uname -a
docker --version
docker-compose --version
free -h
df -h
docker-compose ps
docker-compose logs --tail=50
```

---

**หมายเหตุ**: คู่มือนี้ครอบคลุมการใช้งานพื้นฐาน สำหรับ advanced features อาจต้องศึกษาเพิ่มเติมตามความต้องการ
