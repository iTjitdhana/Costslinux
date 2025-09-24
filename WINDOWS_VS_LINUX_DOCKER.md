# Windows vs Linux Docker Differences

ความแตกต่างระหว่างการรัน Docker บน Windows และ Linux

## 🖥️ Windows Docker Desktop

### สาเหตุที่ไม่ต้องเปลี่ยน port:

1. **Virtual Machine**: Docker Desktop รันบน Hyper-V หรือ WSL2
   - Ports ของ host OS แยกจาก Docker containers
   - ไม่มี MySQL service รันอยู่บน host

2. **Port Management**: Docker Desktop จัดการ port ได้ดีกว่า
   - ไม่มี service conflicts
   - Port binding ทำงานได้ปกติ

3. **Service Isolation**: 
   - Windows services ไม่รันใน Docker environment
   - ไม่มี MySQL/MariaDB service ที่ขัดแย้ง

## 🐧 Linux Docker

### สาเหตุที่มีปัญหา:

1. **Native Docker**: รันโดยตรงบน Linux kernel
   - Ports ของ host OS แชร์กับ Docker containers
   - MySQL service รันบน host OS

2. **Service Conflicts**:
   ```bash
   # MySQL service รันอยู่บน host
   sudo systemctl status mysql
   sudo systemctl status mariadb
   ```

3. **Port Binding Issues**:
   - Port 3306 ถูกใช้งานโดย MySQL service
   - Docker ไม่สามารถ bind port ได้

## 🔧 วิธีแก้ไขบน Linux

### วิธีที่ 1: หยุด MySQL service
```bash
sudo systemctl stop mysql
sudo systemctl stop mariadb
sudo systemctl disable mysql
sudo systemctl disable mariadb
```

### วิธีที่ 2: เปลี่ยน port ใน docker-compose.yml
```yaml
services:
  mysql:
    ports:
      - "3308:3306"  # เปลี่ยนจาก 3306 เป็น 3308
```

### วิธีที่ 3: ใช้ Docker network แทน port mapping
```yaml
services:
  mysql:
    # ลบ ports section
    # ports:
    #   - "3306:3306"
```

## 📊 เปรียบเทียบ

| Aspect | Windows Docker Desktop | Linux Docker |
|--------|----------------------|--------------|
| **Architecture** | Virtual Machine | Native |
| **Port Management** | Isolated | Shared with host |
| **Service Conflicts** | ไม่มี | มีได้ |
| **Performance** | ช้ากว่า | เร็วกว่า |
| **Resource Usage** | ใช้ RAM มาก | ใช้ RAM น้อย |

## 🎯 สรุป

- **Windows**: ไม่ต้องเปลี่ยน port เพราะ Docker Desktop รันแยกจาก host OS
- **Linux**: ต้องเปลี่ยน port หรือหยุด MySQL service เพราะ Docker รันโดยตรงบน host OS

## 💡 แนะนำ

สำหรับ Linux server:
1. หยุด MySQL service ที่รันอยู่
2. หรือเปลี่ยน port ใน docker-compose.yml
3. หรือใช้ Docker network แทน port mapping

สำหรับ Windows:
- ไม่ต้องแก้ไขอะไร เพียงรัน `docker compose up -d` ได้เลย
