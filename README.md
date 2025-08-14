# ระบบคำนวณต้นทุนการผลิต (Production Cost Calculation System)

ระบบคำนวณต้นทุนการผลิตสำหรับโรงงานอาหาร ประกอบด้วย Backend API (Node.js/Express) และ Frontend (React) ที่เชื่อมต่อกับฐานข้อมูล MySQL

## 🏗️ โครงสร้างระบบ

```
production-cost-system/
├── backend/                 # Backend API (Node.js/Express)
│   ├── database/
│   │   └── connection.js    # การเชื่อมต่อฐานข้อมูล
│   ├── routes/
│   │   ├── batches.js       # API สำหรับจัดการล็อตการผลิต
│   │   ├── materials.js     # API สำหรับจัดการวัตถุดิบ
│   │   ├── production.js    # API สำหรับผลผลิต
│   │   └── costs.js         # API สำหรับคำนวณต้นทุน
│   ├── server.js            # ไฟล์หลักของ server
│   ├── package.json         # Dependencies ของ Backend
│   └── config.env           # การตั้งค่าฐานข้อมูล
├── frontend/                # Frontend (React)
│   ├── src/
│   │   ├── components/      # React Components
│   │   ├── pages/           # หน้าต่างๆ
│   │   ├── services/        # API Services
│   │   └── App.js           # ไฟล์หลักของ React App
│   ├── package.json         # Dependencies ของ Frontend
│   └── tailwind.config.js   # การตั้งค่า Tailwind CSS
├── Structure_new_database.sql  # โครงสร้างฐานข้อมูล
└── README.md               # ไฟล์นี้
```

## 🚀 การติดตั้ง

### 1. ข้อกำหนดเบื้องต้น
- Node.js (v16 หรือใหม่กว่า)
- MySQL (v8.0 หรือใหม่กว่า)
- npm หรือ yarn

### 2. การตั้งค่าฐานข้อมูล
1. สร้างฐานข้อมูล MySQL ชื่อ `esp_tracker`
2. Import ไฟล์ `Structure_new_database.sql` เข้าฐานข้อมูล
3. แก้ไขไฟล์ `config.env` ให้ตรงกับการตั้งค่าฐานข้อมูลของคุณ

### 3. การติดตั้ง Backend
```bash
# ติดตั้ง dependencies
npm install

# เริ่มต้น server (Development)
npm run dev

# เริ่มต้น server (Production)
npm start
```

### 4. การติดตั้ง Frontend
```bash
cd frontend

# ติดตั้ง dependencies
npm install

# เริ่มต้น development server
npm start
```

## ⚙️ การตั้งค่า

### ไฟล์ config.env (Backend)
```env
# Database Configuration
DB_HOST=192.168.0.94
DB_USER=jitdhana
DB_PASSWORD=iT12345$
DB_NAME=esp_tracker
DB_PORT=3306

# Server Configuration
PORT=3104
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3014

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Ports ที่ใช้
- **Backend API**: 3104
- **Frontend**: 3014
- **Database**: 3306

## 📊 ฟีเจอร์หลัก

### 1. การจัดการล็อตการผลิต (Batch Management)
- สร้างล็อตการผลิตใหม่
- ติดตามสถานะล็อต (เตรียมการ, กำลังผลิต, เสร็จสิ้น, ยกเลิก)
- ดูรายการล็อตทั้งหมด

### 2. การตวงวัตถุดิบ (Material Weighing)
- บันทึกการตวงวัตถุดิบตาม BOM
- คำนวณต้นทุนวัตถุดิบอัตโนมัติ
- ติดตามการใช้วัตถุดิบจริง

### 3. การบันทึกผลผลิต (Production Results)
- บันทึกผลผลิตดีและเสีย
- คำนวณ Yield percentage
- บันทึกเวลาการผลิต

### 4. การคำนวณต้นทุน (Cost Calculation)
- คำนวณต้นทุนวัตถุดิบ
- คำนวณต้นทุนแรงงาน
- คำนวณต้นทุนการสูญเสีย
- คำนวณต้นทุนสาธารณูปโภค
- สรุปต้นทุนรวม

### 5. รายงานและ Dashboard
- ภาพรวมการผลิต
- สถิติประสิทธิภาพ
- รายงานต้นทุนรายวัน/รายเดือน

## 🔌 API Endpoints

### Batches
- `GET /api/batches` - ดึงรายการล็อตทั้งหมด
- `GET /api/batches/:id` - ดึงข้อมูลล็อตตาม ID
- `POST /api/batches` - สร้างล็อตใหม่
- `PUT /api/batches/:id/status` - อัพเดทสถานะล็อต

### Materials
- `GET /api/materials` - ดึงรายการวัตถุดิบ
- `GET /api/materials/bom/:fgCode` - ดึง BOM ตามรหัสผลิตภัณฑ์
- `POST /api/materials/weighing` - บันทึกการตวงวัตถุดิบ
- `GET /api/materials/usage/:batchId` - ดึงข้อมูลการใช้วัตถุดิบ

### Production
- `POST /api/production/results` - บันทึกผลผลิต
- `GET /api/production/results/:batchId` - ดึงผลผลิต
- `POST /api/production/logs` - บันทึก log การผลิต
- `GET /api/production/logs/:batchId` - ดึง logs การผลิต

### Costs
- `POST /api/costs/calculate` - คำนวณต้นทุน
- `GET /api/costs/batch/:batchId` - ดึงข้อมูลต้นทุนของล็อต
- `GET /api/costs/summary` - สรุปต้นทุนตามวันที่
- `GET /api/costs/detailed/:batchId` - ข้อมูลต้นทุนแบบละเอียด

## 🗄️ โครงสร้างฐานข้อมูล

### ตารางหลัก
- `production_batches` - ล็อตการผลิต
- `batch_material_usage` - การใช้วัตถุดิบจริง
- `batch_production_results` - ผลผลิตจริง
- `production_costs` - ข้อมูลต้นทุน

### ตารางอ้างอิง
- `fg` - ผลิตภัณฑ์
- `fg_bom` - Bill of Materials
- `material` - วัตถุดิบ
- `work_plans` - แผนการผลิต
- `logs` - Logs การผลิต

## 🎨 UI/UX Features

- **Responsive Design** - รองรับทุกขนาดหน้าจอ
- **Modern UI** - ใช้ Tailwind CSS และ Lucide Icons
- **Real-time Updates** - อัพเดทข้อมูลแบบ Real-time
- **Toast Notifications** - แจ้งเตือนการทำงาน
- **Loading States** - แสดงสถานะการโหลด
- **Error Handling** - จัดการข้อผิดพลาด

## 🔧 การพัฒนา

### การเพิ่มฟีเจอร์ใหม่
1. สร้าง API endpoint ใน Backend
2. สร้าง React component ใน Frontend
3. เพิ่ม route ใน App.js
4. ทดสอบการทำงาน

### การแก้ไขฐานข้อมูล
1. แก้ไขไฟล์ `Structure_new_database.sql`
2. รัน migration script
3. อัพเดท API endpoints ที่เกี่ยวข้อง
4. ทดสอบการทำงาน

## 🚨 การแก้ไขปัญหา

### ปัญหาการเชื่อมต่อฐานข้อมูล
- ตรวจสอบการตั้งค่าใน `config.env`
- ตรวจสอบการเชื่อมต่อเครือข่าย
- ตรวจสอบสิทธิ์การเข้าถึงฐานข้อมูล

### ปัญหา CORS
- ตรวจสอบการตั้งค่า CORS_ORIGIN ใน Backend
- ตรวจสอบ URL ของ Frontend

### ปัญหาการ Build
- ลบโฟลเดอร์ `node_modules` และ `package-lock.json`
- รัน `npm install` ใหม่
- ตรวจสอบเวอร์ชันของ Node.js

## 📝 License

MIT License

## 🤝 การสนับสนุน

หากมีปัญหาหรือคำถาม สามารถติดต่อได้ที่:
- Email: support@example.com
- GitHub Issues: [สร้าง Issue ใหม่](https://github.com/your-repo/issues)

---

**หมายเหตุ**: ระบบนี้พัฒนาขึ้นเพื่อใช้งานภายในองค์กร กรุณาตรวจสอบความปลอดภัยก่อนใช้งานจริง
