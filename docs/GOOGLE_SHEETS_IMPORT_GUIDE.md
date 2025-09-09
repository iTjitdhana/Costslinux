# คู่มือการ Import ข้อมูลจาก Google Sheets

## ภาพรวม

ระบบนี้ช่วยให้คุณสามารถนำเข้าข้อมูลจาก Google Sheets ไปยังตาราง `default_itemvalue` ในฐานข้อมูลได้อย่างอัตโนมัติ โดยมีการตรวจสอบข้อมูลซ้ำและจัดการข้อผิดพลาด

## คุณสมบัติ

- ✅ **Import ข้อมูลอัตโนมัติ** จาก Google Sheets
- ✅ **ตรวจสอบข้อมูลซ้ำ** ตาม `material_id` และ `effective_date`
- ✅ **อัพเดทข้อมูลเดิม** หากพบข้อมูลซ้ำ
- ✅ **Logging และ Error Handling** ที่ครบถ้วน
- ✅ **การตรวจสอบความถูกต้อง** ของข้อมูล
- ✅ **การแปลงหน่วยอัตโนมัติ** (display_unit → base_unit)

## ขั้นตอนการติดตั้ง

### 1. ติดตั้ง Dependencies

```bash
npm install
```

### 2. ตั้งค่า Google Sheets API

ทำตามคู่มือใน `scripts/setup-google-sheets-api.md`

### 3. ตั้งค่า Environment Variables

แก้ไขไฟล์ `config.env`:

```env
# Google Sheets Configuration
GOOGLE_SHEETS_CREDENTIALS_PATH=scripts/google-sheets-credentials.json
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_RANGE=A:J
```

### 4. แชร์ Google Sheets

ให้สิทธิ์ "Editor" แก่ Service Account email ที่ได้จากไฟล์ credentials

## การใช้งาน

### 1. ทดสอบการเชื่อมต่อ

```bash
node scripts/test-google-sheets-connection.js
```

### 2. Import ข้อมูล

```bash
npm run import-sheets
```

หรือ

```bash
node scripts/import-google-sheets.js
```

## โครงสร้างข้อมูลที่รองรับ

### Google Sheets Columns

ระบบรองรับคอลัมน์ต่อไปนี้:

| คอลัมน์ | คำอธิบาย | ตัวอย่าง |
|---------|----------|----------|
| หมวดหมู่ | ประเภทสินค้า | ทะเลทอด, ของแห้ง |
| รหัสสินค้า | รหัสวัสดุ | 105001, 111001 |
| ชื่อสินค้า | ชื่อวัสดุ | กุ้ง 36-40 ตัว/กก. |
| จํานวนนับ | จำนวน | 84.50 |
| หน่วย | หน่วยวัด | กก., กระปุก, หีบ |
| ราคาทุนต่อหน่วย | ราคาต่อหน่วย | 240.00 |
| มูลค่า | มูลค่ารวม | 20,280.00 |

### Database Schema

ข้อมูลจะถูกบันทึกในตาราง `default_itemvalue`:

```sql
CREATE TABLE `default_itemvalue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `material_id` int NOT NULL,
  `material_name` varchar(255) NOT NULL,
  `display_unit` varchar(255) NOT NULL,
  `base_unit` varchar(255) NOT NULL,
  `display_to_base_rate` decimal(18,6) NOT NULL DEFAULT 1.000000,
  `price_per_unit` decimal(18,6) NOT NULL DEFAULT 0.000000,
  `currency` char(3) NOT NULL DEFAULT 'THB',
  `source` varchar(100) NULL,
  `effective_date` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
```

### การแปลงหน่วยอัตโนมัติ

ระบบจะแปลงหน่วยอัตโนมัติตามตารางนี้:

| Display Unit | Base Unit | Conversion Rate |
|--------------|-----------|-----------------|
| กก. | กก. | 1.0 |
| กรัม | กก. | 0.001 |
| ตัน | กก. | 1000 |
| กระปุก | กระปุก | 1.0 |
| ขวด | ขวด | 1.0 |
| กระป๋อง | กระป๋อง | 1.0 |
| หีบ | หีบ | 1.0 |
| แพ็ค | แพ็ค | 1.0 |
| ถุง | ถุง | 1.0 |
| แกลลอน | ลิตร | 3.78541 |
| ลิตร | ลิตร | 1.0 |
| มิลลิลิตร | ลิตร | 0.001 |
| ชิ้น | ชิ้น | 1.0 |
| ตัว | ตัว | 1.0 |
| หน่วย | หน่วย | 1.0 |

## การตรวจสอบข้อมูลซ้ำ

ระบบจะตรวจสอบข้อมูลซ้ำตามเงื่อนไข:
- `material_id` (รหัสสินค้า)
- `effective_date` (วันที่มีผล)

หากพบข้อมูลซ้ำ:
- **อัพเดทข้อมูลเดิม** ด้วยข้อมูลใหม่
- **บันทึก log** การเปลี่ยนแปลง

## Logging

ระบบจะแสดง log ดังนี้:

```
[2025-01-27T10:30:00.000Z] [INFO] Starting Google Sheets import process...
[2025-01-27T10:30:01.000Z] [INFO] Database connection established successfully
[2025-01-27T10:30:02.000Z] [INFO] Google Sheets authentication successful
[2025-01-27T10:30:03.000Z] [INFO] Fetched 30 rows from Google Sheets
[2025-01-27T10:30:04.000Z] [INFO] Successfully parsed 28 valid records
[2025-01-27T10:30:05.000Z] [INFO] Found 2 duplicate records
[2025-01-27T10:30:06.000Z] [INFO] Updated: กุ้ง 36-40 ตัว/กก. (ID: 105001)
[2025-01-27T10:30:07.000Z] [SUCCESS] Import completed successfully!
[2025-01-27T10:30:07.000Z] [INFO] Summary: 26 inserted, 2 updated, 0 skipped
```

## การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

1. **Credentials file not found**
   - ตรวจสอบว่าไฟล์ `google-sheets-credentials.json` อยู่ในโฟลเดอร์ `scripts/`
   - ตรวจสอบ path ใน `config.env`

2. **Spreadsheet ID not configured**
   - ตั้งค่า `GOOGLE_SHEETS_SPREADSHEET_ID` ใน `config.env`
   - Spreadsheet ID คือส่วนของ URL ระหว่าง /d/ และ /edit

3. **Permission denied**
   - ตรวจสอบว่าได้แชร์ Google Sheets กับ Service Account email แล้ว
   - ให้สิทธิ์ "Editor" แก่ Service Account

4. **No data found**
   - ตรวจสอบ range ใน `config.env` (ค่าเริ่มต้น: A:J)
   - ตรวจสอบว่าข้อมูลอยู่ในช่วงที่กำหนด

### การ Debug

ใช้ script ทดสอบการเชื่อมต่อ:

```bash
node scripts/test-google-sheets-connection.js
```

## การตั้งเวลาอัตโนมัติ

### Windows (Task Scheduler)

1. สร้างไฟล์ batch: `import-sheets.bat`
```batch
cd /d C:\Cots
node scripts/import-google-sheets.js
```

2. ตั้งค่า Task Scheduler ให้รันไฟล์ batch ตามเวลาที่ต้องการ

### Linux/Mac (Cron)

เพิ่มใน crontab:
```bash
# รันทุกวันเวลา 9:00 น.
0 9 * * * cd /path/to/Cots && node scripts/import-google-sheets.js
```

## ความปลอดภัย

- ไฟล์ credentials จะไม่ถูก commit ไปยัง Git
- ใช้ Service Account แทน User Account
- จำกัดสิทธิ์การเข้าถึงเฉพาะ Google Sheets API
- ใช้ environment variables สำหรับข้อมูลที่สำคัญ

## การสนับสนุน

หากพบปัญหา กรุณาตรวจสอบ:
1. Log files
2. การตั้งค่า environment variables
3. สิทธิ์การเข้าถึง Google Sheets
4. การเชื่อมต่อฐานข้อมูล
