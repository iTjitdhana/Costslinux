# Docker Deployment Guide

คู่มือการ deploy ระบบ Cost Calculation บน Linux Server ด้วย Docker และ GitHub

## 📋 สิ่งที่ต้องเตรียม

### 1. Server Requirements
- **OS**: Ubuntu 20.04+ หรือ CentOS 8+
- **RAM**: อย่างน้อย 4GB
- **Storage**: อย่างน้อย 20GB
- **Network**: Port 80, 443, 22 เปิดใช้งาน

### 2. Software Requirements
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- Nginx (สำหรับ reverse proxy - optional)

## 🚀 การติดตั้งและ Deploy

### ขั้นตอนที่ 1: เตรียม Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install git -y

# Logout and login again to apply docker group changes
```

### ขั้นตอนที่ 2: Clone Project จาก GitHub

```bash
# สร้าง directory สำหรับ project
sudo mkdir -p /opt/cost-calculation-system
sudo chown $USER:$USER /opt/cost-calculation-system

# Clone repository
cd /opt/cost-calculation-system
git clone https://github.com/your-username/your-repo.git .

# หรือถ้ามี SSH key setup แล้ว
git clone git@github.com:your-username/your-repo.git .
```

### ขั้นตอนที่ 3: ตั้งค่า Environment

```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

**สำคัญ**: ต้องเปลี่ยนค่าเหล่านี้ในไฟล์ `.env`:
- `DB_PASSWORD`: รหัสผ่านฐานข้อมูลที่แข็งแรง
- `MYSQL_ROOT_PASSWORD`: รหัสผ่าน root ของ MySQL
- `DEFAULT_ITEM_DB_PASSWORD`: รหัสผ่านฐานข้อมูล default_itemvalue
- `CORS_ORIGIN`: domain ของ server (เช่น `https://yourdomain.com`)

### ขั้นตอนที่ 4: Deploy ด้วย Docker Compose

```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

หรือใช้คำสั่ง Docker Compose โดยตรง:

```bash
# Build and start services
docker-compose up -d --build

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

## 🔧 การจัดการ Services

### คำสั่งพื้นฐาน

```bash
# ดูสถานะ services
docker-compose ps

# ดู logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Update และ restart
docker-compose pull
docker-compose up -d

# Clean up unused images
docker image prune -f
```

### การ Backup ฐานข้อมูล

```bash
# Backup main database
docker exec cost_calculation_mysql mysqldump -u root -p esp_tracker > backup_esp_tracker_$(date +%Y%m%d_%H%M%S).sql

# Backup default_itemvalue database
docker exec cost_calculation_mysql_default mysqldump -u root -p default_itemvalue > backup_default_itemvalue_$(date +%Y%m%d_%H%M%S).sql
```

### การ Restore ฐานข้อมูล

```bash
# Restore main database
docker exec -i cost_calculation_mysql mysql -u root -p esp_tracker < backup_esp_tracker_20241201_120000.sql

# Restore default_itemvalue database
docker exec -i cost_calculation_mysql_default mysql -u root -p default_itemvalue < backup_default_itemvalue_20241201_120000.sql
```

## 🌐 การตั้งค่า Domain และ SSL

### 1. ตั้งค่า Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/cost-calculation
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/cost-calculation /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. ตั้งค่า SSL ด้วย Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 🔄 การอัพเดทผ่าน GitHub Actions

### 1. ตั้งค่า GitHub Secrets

ไปที่ GitHub Repository → Settings → Secrets and variables → Actions

เพิ่ม secrets ต่อไปนี้:
- `SERVER_HOST`: IP address ของ server
- `SERVER_USER`: username สำหรับ SSH
- `SERVER_SSH_KEY`: private SSH key
- `SLACK_WEBHOOK`: webhook URL สำหรับ notification (optional)

### 2. การ Deploy อัตโนมัติ

เมื่อ push code ไปที่ branch `main` ระบบจะ deploy อัตโนมัติ

```bash
# Push changes to trigger deployment
git add .
git commit -m "Update application"
git push origin main
```

## 📊 การ Monitor และ Troubleshooting

### Health Check

```bash
# Check backend health
curl http://localhost:3104/health

# Check frontend
curl http://localhost:80

# Check database connections
docker exec cost_calculation_backend node -e "
const { testConnection } = require('./database/connection');
testConnection().then(() => console.log('DB OK')).catch(console.error);
"
```

### ดู Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql

# Last 100 lines
docker-compose logs --tail=100 -f
```

### Performance Monitoring

```bash
# Docker stats
docker stats

# System resources
htop
df -h
free -h
```

## 🚨 การแก้ไขปัญหาที่พบบ่อย

### 1. Container ไม่สามารถ start ได้

```bash
# Check logs
docker-compose logs [service_name]

# Check configuration
docker-compose config

# Rebuild images
docker-compose build --no-cache
```

### 2. Database connection error

```bash
# Check database status
docker-compose ps mysql

# Check database logs
docker-compose logs mysql

# Test connection
docker exec -it cost_calculation_mysql mysql -u root -p
```

### 3. Port conflicts

```bash
# Check port usage
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :3104

# Kill process using port
sudo fuser -k 80/tcp
```

### 4. Memory issues

```bash
# Check memory usage
docker stats

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## 📝 การบำรุงรักษา

### Daily Tasks
- ตรวจสอบ logs: `docker-compose logs --tail=50`
- ตรวจสอบ disk space: `df -h`
- ตรวจสอบ service status: `docker-compose ps`

### Weekly Tasks
- Clean up unused Docker images: `docker image prune -f`
- Backup databases
- Update system packages: `sudo apt update && sudo apt upgrade`

### Monthly Tasks
- Review logs for errors
- Update Docker images: `docker-compose pull`
- Test disaster recovery procedures

## 🔒 Security Best Practices

1. **เปลี่ยน default passwords** ในไฟล์ `.env`
2. **ใช้ firewall** เพื่อจำกัดการเข้าถึง
3. **อัพเดทระบบ** เป็นประจำ
4. **Backup ข้อมูล** เป็นประจำ
5. **Monitor logs** เพื่อหาการบุกรุก
6. **ใช้ SSL/TLS** สำหรับ production

## 📞 การขอความช่วยเหลือ

หากพบปัญหา:
1. ตรวจสอบ logs ก่อน
2. ดู documentation ใน `/docs` folder
3. สร้าง issue ใน GitHub repository
4. ติดต่อทีมพัฒนา

---

**หมายเหตุ**: คู่มือนี้ครอบคลุมการ deploy พื้นฐาน สำหรับ production environment ที่มีความซับซ้อนมากขึ้น อาจต้องมีการปรับแต่งเพิ่มเติม
