# Production Cost Calculation System

ระบบคำนวณต้นทุนการผลิตสำหรับโรงงานอาหาร

## 🚀 การรันระบบ

### วิธีที่ 1: รันด้วยสคริปต์ (แนะนำ)

#### รันระบบทั้งหมด
```bash
# ดับเบิลคลิกไฟล์
start-system.bat
```

#### รันแยกส่วน
```bash
# รัน Backend เท่านั้น
scripts\start-backend.bat

# รัน Frontend เท่านั้น  
scripts\start-frontend.bat
```

#### หยุดระบบ
```bash
# หยุดระบบทั้งหมด
scripts\stop-system.bat
```

### วิธีที่ 2: รันด้วยคำสั่ง

#### Backend
```bash
cd backend
npm start
```

#### Frontend
```bash
cd frontend
npm start
```

## 📊 URL การเข้าถึง

### Local Access
- **Frontend:** http://localhost:3014
- **Backend:** http://localhost:3104
- **Health Check:** http://localhost:3104/health
- **API Test:** http://localhost:3104/test

### Network Access
- **Frontend:** http://192.168.0.94:3014
- **Backend:** http://192.168.0.94:3104

## ⬇️ วิธีดึงโค้ดและเริ่มใช้งาน (Clone & Setup)

### 1) ดึงโค้ดจาก GitHub
```bash
git clone https://github.com/iTjitdhana/costs_logs.git
cd costs_logs
```

### 2) ตั้งค่า Environment
- สร้างไฟล์ `config.env` ที่รูทโปรเจกต์ (ค่าเช่นเดียวกับตัวอย่างใน README นี้)
- ตัวอย่างที่จำเป็นขั้นต่ำ:
```
PORT=3104
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=esp_tracker
DB_USER=<your_user>
DB_PASSWORD=<your_password>

DEFAULT_ITEM_DB_HOST=127.0.0.1
DEFAULT_ITEM_DB_PORT=3306
DEFAULT_ITEM_DB_NAME=default_itemvalue
DEFAULT_ITEM_DB_USER=<your_user>
DEFAULT_ITEM_DB_PASSWORD=<your_password>
```

### 3) ติดตั้งแพ็กเกจ
```bash
# ติดตั้งของ Backend
cd backend
npm install

# ติดตั้งของ Frontend
cd ../frontend
npm install

# กลับสู่รูทโปรเจกต์
cd ..
```

### 4) รันระบบ
วิธีที่เร็วสุด (Windows):
```bash
scripts\start-backend.bat   # เปิด Backend
scripts\start-frontend.bat  # เปิด Frontend
```

หรือรันด้วยคำสั่งมาตรฐาน:
```bash
# Backend
cd backend && npm start

# Frontend (เปิด terminal ใหม่)
cd frontend && npm start
```

เมื่อรันสำเร็จ:
- Frontend: `http://localhost:3014`
- Backend: `http://localhost:3104`

## 🗄️ Database Configuration

### Main Database
- **Host:** 192.168.0.94
- **Port:** 3306
- **Database:** esp_tracker
- **User:** jitdhana

### Default Item Value Database
- **Host:** 192.168.0.94
- **Port:** 3306
- **Database:** default_itemvalue
- **User:** jitdhana
- **Purpose:** เก็บราคากลางของสินค้าและวัตถุดิบ

## 📁 โครงสร้างโปรเจค

```
Cots/
├── start-system.bat        # ไฟล์เริ่มระบบหลัก
├── README.md              # คู่มือการใช้งาน
├── config.env             # Environment variables
├── package.json           # Node.js dependencies
├── backup_info.json       # ข้อมูล backup
├── backend/               # Node.js/Express API
│   ├── server.js         # Main server file
│   ├── database/         # Database connection
│   └── routes/routes/    # API routes
├── frontend/             # React application
│   ├── src/pages/        # Page components
│   ├── src/components/   # UI components
│   └── src/services/     # API services
├── scripts/              # Scripts และ batch files
│   ├── *.bat            # Windows batch scripts
│   └── *.js             # Utility scripts
├── database/             # Database files
│   └── *.sql            # SQL scripts และ schema
└── docs/                # Documentation
    └── *.md             # Markdown documentation
```

## 🔧 Features

### Backend API
- ✅ Production batches management
- ✅ Material weighing and BOM
- ✅ Production results recording
- ✅ Cost calculation with default_itemvalue integration
- ✅ Dual database connection (main + default_itemvalue)
- ✅ Database integration
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ Error handling

### Frontend UI
- ✅ Batch management
- ✅ Material weighing
- ✅ Production results
- ✅ Cost calculation with BOM-based pricing
- ✅ Cost analysis reports
- ✅ Dashboard
- ✅ Responsive design
- ✅ Real-time price updates from default_itemvalue

## 🛠️ Dependencies

### Backend
- express
- mysql2
- cors
- helmet
- morgan
- express-rate-limit
- dotenv

### Frontend
- react
- react-router-dom
- axios
- react-hook-form
- react-hot-toast
- lucide-react
- tailwindcss

## 📝 การใช้งาน

1. **สร้างล็อตการผลิต**
   - ไปที่หน้า "สร้างล็อตการผลิต"
   - เลือก Work Plan ของวัน
   - ใส่จำนวนวางแผน
   - สร้างล็อต

2. **ตวงวัตถุดิบ**
   - ไปที่หน้า "ตวงวัตถุดิบ"
   - เลือกล็อต
   - โหลด BOM หรือเพิ่มวัตถุดิบเอง
   - บันทึกการตวง

3. **บันทึกผลผลิต**
   - ไปที่หน้า "บันทึกผลผลิต"
   - เลือกล็อต
   - ใส่จำนวนผลิตได้และของเสีย
   - บันทึกผลผลิต

4. **คำนวณต้นทุน**
   - ไปที่หน้า "คำนวณต้นทุน"
   - เลือกล็อต
   - ดูรายละเอียดต้นทุน

5. **รายงานต้นทุน**
   - ไปที่หน้า "รายงานต้นทุน"
   - เลือกวันที่
   - ดูสรุปต้นทุน

6. **วิเคราะห์ต้นทุน**
   - ไปที่หน้า "วิเคราะห์ต้นทุน"
   - ดูต้นทุนตาม BOM และการผลิตจริง
   - เปรียบเทียบต้นทุนตั้งต้นกับต้นทุนจริง

## 🔍 Troubleshooting

### ปัญหาที่พบบ่อย

1. **Backend ไม่เชื่อมต่อ Database**
   - ตรวจสอบ config.env
   - ตรวจสอบ MySQL service
   - ตรวจสอบ network connectivity
   - ตรวจสอบการเชื่อมต่อ default_itemvalue database

2. **Frontend ไม่เชื่อม Backend**
   - ตรวจสอบ CORS configuration
   - ตรวจสอบ API URL ใน frontend
   - ตรวจสอบ firewall settings

3. **Port ถูกใช้งาน**
   - ใช้ `netstat -ano | findstr :3104` (Backend)
   - ใช้ `netstat -ano | findstr :3014` (Frontend)
   - หยุด process ที่ใช้ port นั้น

4. **ราคาแสดงเป็น ฿0.00**
   - ตรวจสอบการเชื่อมต่อ default_itemvalue database
   - ตรวจสอบ material IDs ใน BOM
   - ตรวจสอบ API endpoint /api/prices

### Logs
- Backend logs: ดูใน terminal ที่รัน backend
- Frontend logs: เปิด Developer Tools (F12) > Console

## 📚 Documentation

- Deployment: `docs/DEPLOYMENT.md`
- Architecture: `docs/ARCHITECTURE.md`
- API: `docs/API.md`
- Database: `docs/DATABASE.md`
- Runbook (Operations): `docs/RUNBOOK.md`
- Security: `docs/SECURITY.md`
- RBAC: `docs/RBAC_GUIDE.md`
- Quick Start (Google Sheets): `docs/QUICK_START_GOOGLE_SHEETS.md`
 - Env examples: `docs/ENV_EXAMPLES.md`
 - Merge Database Guide: `docs/MERGE_DATABASE_GUIDE.md`
 - Google Apps Script: `docs/GOOGLE_APPS_SCRIPT_GUIDE.md`
 - Google Sheets Import: `docs/GOOGLE_SHEETS_IMPORT_GUIDE.md`
 - System Design (Cost Calculation): `docs/cost_calculation_app_design.md`
 - Code Style: `docs/CODE_STYLE.md`
 - Contributing: `docs/CONTRIBUTING.md`
 - Archive (historical fixes): `docs/archive/`

### Environment Examples
- Backend: `config.env.example` (คัดลอกไปเป็น `config.env` แล้วแก้ค่า)
- Frontend: ดูตัวอย่างใน `docs/ENV_EXAMPLES.md` แล้วคัดลอกไปสร้าง `frontend/.env`

## 📞 Support

หากมีปัญหาในการใช้งาน กรุณาติดต่อทีมพัฒนา
