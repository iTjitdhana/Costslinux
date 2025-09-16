# คู่มือการติดตั้งระบบ Cost Calculation

## ข้อกำหนดระบบ
- Node.js version 16 หรือสูงกว่า
- npm หรือ yarn
- MySQL Database

## ขั้นตอนการติดตั้ง

### 1. ติดตั้ง Dependencies สำหรับ Frontend
```bash
cd frontend
npm install
```

### 2. ติดตั้ง Dependencies สำหรับ Backend
```bash
cd backend
npm install
```

### 3. ตั้งค่า Environment Variables
สร้างไฟล์ `config.env` ในโฟลเดอร์ root โดยคัดลอกจาก `config.env.example`:

```bash
# Database Configuration
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database_name
DB_PORT=3306

# Server Configuration
PORT=3104
NODE_ENV=development
```

### 4. ตั้งค่าฐานข้อมูล
- สร้างฐานข้อมูล MySQL ตามชื่อที่กำหนดใน `config.env`
- Import ไฟล์ SQL ที่จำเป็น (ถ้ามี)

### 5. เริ่มต้นระบบ

#### เริ่ม Backend:
```bash
cd backend
node server.js
```

#### เริ่ม Frontend:
```bash
cd frontend
npm start
```

## Dependencies ที่สำคัญ

### Frontend Dependencies:
- **antd**: ^5.12.8 - UI Component Library (สำคัญสำหรับ DatePicker)
- **react**: ^18.2.0 - React Framework
- **react-dom**: ^18.2.0 - React DOM
- **dayjs**: ^1.11.18 - Date manipulation library
- **axios**: ^1.4.0 - HTTP client
- **react-router-dom**: ^6.11.2 - Routing
- **react-hot-toast**: ^2.4.1 - Toast notifications
- **lucide-react**: ^0.263.1 - Icons
- **tailwindcss**: ^3.3.2 - CSS Framework

### Backend Dependencies:
- **express**: Web framework
- **mysql2**: MySQL database driver
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variables

## การแก้ไขปัญหา

### ปัญหา Ant Design useContext Error:
หากพบ error `Cannot read properties of null (reading 'useContext')`:

1. ตรวจสอบว่าใช้ Ant Design version 5.12.8
2. ตรวจสอบการ import ConfigProvider
3. ใช้ AntdConfigProvider wrapper component ที่สร้างไว้

### ปัญหาการเชื่อมต่อฐานข้อมูล:
1. ตรวจสอบการตั้งค่าใน `config.env`
2. ตรวจสอบว่า MySQL server ทำงานอยู่
3. ตรวจสอบ username/password และชื่อฐานข้อมูล

## การอัพเดท
```bash
# อัพเดท dependencies ทั้งหมด
npm update

# หรือติดตั้งใหม่
rm -rf node_modules package-lock.json
npm install
```

## หมายเหตุ
- ระบบใช้ Ant Design version 5.12.8 (downgrade จาก 5.27.3 เพื่อแก้ปัญหา useContext)
- ใช้ wrapper component `AntdConfigProvider` สำหรับจัดการ ConfigProvider
- ระบบรองรับการทำงานแบบ offline และ online
