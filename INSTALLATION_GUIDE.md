# คู่มือการติดตั้งระบบ Cost Calculation

## ข้อกำหนดระบบ
- Node.js version 16 หรือสูงกว่า
- npm หรือ yarn
- MySQL Database

## ขั้นตอนการติดตั้ง

### 1. ติดตั้ง Dependencies

**วิธีที่ 1: ติดตั้งแบบ Fresh (แนะนำสำหรับเครื่องใหม่)**
```bash
# ใช้สคริปต์อัตโนมัติ
scripts\fresh-install.bat
```

**วิธีที่ 2: ติดตั้งแบบ Manual**
```bash
# ติดตั้งของ Root
npm install

# ติดตั้งของ Backend
cd backend
npm install

# ติดตั้งของ Frontend
cd ../frontend
npm install

# กลับสู่รูทโปรเจกต์
cd ..
```

**หมายเหตุ:** หากเกิด React hook errors ให้ใช้วิธีที่ 1 (Fresh Install)

### 2. ตั้งค่า Environment Variables
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

### 3. ตั้งค่าฐานข้อมูล
- สร้างฐานข้อมูล MySQL ตามชื่อที่กำหนดใน `config.env`
- Import ไฟล์ SQL ที่จำเป็น (ถ้ามี)

### 4. เริ่มต้นระบบ

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

### ปัญหา React Hook Errors (Invalid hook call):
หากพบ error `Invalid hook call. Hooks can only be called inside of the body of a function component`:

1. **ใช้ Fresh Install Script:**
   ```bash
   scripts\fresh-install.bat
   ```

2. **หรือลบ node_modules และติดตั้งใหม่:**
   ```bash
   # ลบ node_modules ทั้งหมด
   rmdir /s /q node_modules
   rmdir /s /q frontend\node_modules
   rmdir /s /q backend\node_modules
   
   # ลบ package-lock.json
   del package-lock.json
   del frontend\package-lock.json
   del backend\package-lock.json
   
   # ติดตั้งใหม่
   npm install
   cd frontend && npm install && cd ..
   cd backend && npm install && cd ..
   ```

3. **ตรวจสอบ React versions:**
   - Frontend: React 18.2.0
   - ไม่ควรมี React dependencies ใน root package.json

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
