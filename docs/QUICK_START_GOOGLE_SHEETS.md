# 🚀 Quick Start - Google Sheets Import System

## ✅ สถานะปัจจุบัน

ระบบ **Google Sheets Import** พร้อมใช้งานแล้ว! 

### ข้อมูลที่มีอยู่:
- ✅ ฐานข้อมูล `default_itemvalue` มีอยู่แล้ว
- ✅ ตาราง `default_itemvalue` มีโครงสร้างถูกต้อง
- ✅ มีข้อมูล 271 รายการ (วันที่ 31/7/2025)
- ✅ ไม่มีข้อมูลซ้ำ

## 🎯 ทางเลือกการใช้งาน

### 🥇 **แนะนำ: Google Apps Script** (ง่ายกว่า)
- ✅ ไม่ต้องตั้งค่า API credentials
- ✅ ปลอดภัยกว่าและฟรี
- ✅ เร็วและไม่มี rate limits

### 🥈 Google Sheets API (ซับซ้อนกว่า)
- ❌ ต้องตั้งค่า Service Account
- ❌ มี quota limits
- ❌ ซับซ้อนกว่า

## 📋 ขั้นตอนการใช้งาน

### 🥇 วิธีที่ 1: Google Apps Script (แนะนำ)

#### 1. สร้าง Google Apps Script

1. **เปิด Google Sheets** ที่ต้องการ import ข้อมูล
2. **ไปที่ Extensions** > **Apps Script**
3. **แทนที่โค้ดเริ่มต้น** ด้วยโค้ดจาก `scripts/google-apps-script-code.gs`
4. **แก้ไขการตั้งค่า** ในส่วน `CONFIG`:
   ```javascript
   const CONFIG = {
     API_KEY: 'your-secret-api-key-here',
     SHEET_NAME: 'Sheet1',
     DATA_RANGE: 'A:J',
     HEADER_ROW: 1
   };
   ```

#### 2. Deploy เป็น Web App

1. **คลิก "Deploy"** > **"New deployment"**
2. **เลือก "Web app"**
3. **ตั้งค่า:**
   - **Execute as:** "Me"
   - **Who has access:** "Anyone"
4. **คลิก "Deploy"**
5. **คัดลอก Web App URL**

#### 3. ตั้งค่า Environment Variables

แก้ไขไฟล์ `config.env`:

```env
# Google Apps Script Configuration (แนะนำ)
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
GOOGLE_APPS_SCRIPT_API_KEY=your-secret-api-key-here
```

#### 4. Import ข้อมูล

```bash
npm run import-apps-script
```

หรือใช้ไฟล์ batch:

```bash
import-apps-script.bat
```

### 🥈 วิธีที่ 2: Google Sheets API

#### 1. ตั้งค่า Google Sheets API

ทำตามคู่มือใน `scripts/setup-google-sheets-api.md`

#### 2. ตั้งค่า Environment Variables

```env
# Google Sheets API Configuration
GOOGLE_SHEETS_CREDENTIALS_PATH=scripts/google-sheets-credentials.json
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_RANGE=A:J
```

#### 3. Import ข้อมูล

```bash
npm run import-sheets
```

## 🔧 Scripts ที่มีให้

| Script | คำสั่ง | หน้าที่ |
|--------|--------|---------|
| **Import Apps Script** | `npm run import-apps-script` | นำเข้าข้อมูลผ่าน Google Apps Script (แนะนำ) |
| **Import Sheets API** | `npm run import-sheets` | นำเข้าข้อมูลผ่าน Google Sheets API |
| **ตรวจสอบโครงสร้าง** | `npm run check-structure` | ตรวจสอบฐานข้อมูลและตาราง |
| **ทดสอบการเชื่อมต่อ** | `npm run test-connection` | ทดสอบ Google Sheets API |

## 📊 โครงสร้างข้อมูลที่รองรับ

### Google Sheets Columns:
- `หมวดหมู่` - ประเภทสินค้า
- `รหัสสินค้า` - รหัสวัสดุ (material_id)
- `ชื่อสินค้า` - ชื่อวัสดุ (material_name)
- `หน่วย` - หน่วยวัด (display_unit)
- `ราคาทุนต่อหน่วย` - ราคาต่อหน่วย (price_per_unit)

### การแปลงหน่วยอัตโนมัติ:
- `กก.` → `กก.` (rate: 1.0)
- `กรัม` → `กก.` (rate: 0.001)
- `ตัน` → `กก.` (rate: 1000)
- `แกลลอน` → `ลิตร` (rate: 3.78541)
- และอื่นๆ...

## 🔍 การตรวจสอบข้อมูลซ้ำ

ระบบจะตรวจสอบข้อมูลซ้ำตาม:
- `material_id` (รหัสสินค้า)
- `effective_date` (วันที่มีผล)

**หากพบข้อมูลซ้ำ:**
- ✅ **อัพเดทข้อมูลเดิม** ด้วยข้อมูลใหม่
- ✅ **บันทึก log** การเปลี่ยนแปลง

## 📝 ตัวอย่าง Log Output

```
[2025-01-27T10:30:00.000Z] [INFO] Starting Google Apps Script import process...
[2025-01-27T10:30:01.000Z] [INFO] Database connection established successfully
[2025-01-27T10:30:02.000Z] [INFO] Fetched 30 rows from Google Apps Script
[2025-01-27T10:30:03.000Z] [INFO] Successfully parsed 28 valid records
[2025-01-27T10:30:04.000Z] [INFO] Found 2 duplicate records
[2025-01-27T10:30:05.000Z] [INFO] Updated: กุ้ง 36-40 ตัว/กก. (ID: 105001)
[2025-01-27T10:30:06.000Z] [SUCCESS] Import completed successfully!
[2025-01-27T10:30:06.000Z] [INFO] Summary: 26 inserted, 2 updated, 0 skipped
```

## 🚨 การแก้ไขปัญหา

### Google Apps Script:

1. **Sheet not found**
   - ตรวจสอบชื่อ sheet ใน `CONFIG.SHEET_NAME`
   - ใช้ฟังก์ชัน `validateConfig()` ใน Apps Script Editor

2. **Web App URL not accessible**
   - ตรวจสอบการตั้งค่า "Who has access" เป็น "Anyone"
   - ทดสอบ Web App URL ในเบราว์เซอร์

3. **Invalid API key**
   - ตรวจสอบ API key ใน `config.env`
   - ตรวจสอบว่า API key ตรงกับใน Apps Script

### Google Sheets API:

1. **Credentials file not found**
   ```bash
   npm run test-connection
   ```

2. **Permission denied**
   - ตรวจสอบการแชร์ Google Sheets กับ Service Account
   - ให้สิทธิ์ "Editor" แก่ Service Account

## 🎯 ขั้นตอนถัดไป

### สำหรับ Google Apps Script (แนะนำ):

1. **สร้าง Google Apps Script** ตามคู่มือใน `GOOGLE_APPS_SCRIPT_GUIDE.md`
2. **Deploy เป็น Web App**
3. **ตั้งค่า environment variables**
4. **รัน import:** `npm run import-apps-script`

### สำหรับ Google Sheets API:

1. **ตั้งค่า Google Sheets API** ตามคู่มือ
2. **แก้ไข `config.env`** ใส่ Spreadsheet ID
3. **แชร์ Google Sheets** กับ Service Account
4. **รัน import:** `npm run import-sheets`

## 📞 การสนับสนุน

หากพบปัญหา:
1. ตรวจสอบ log files
2. ใช้ `npm run check-structure` ตรวจสอบฐานข้อมูล
3. ตรวจสอบการตั้งค่า environment variables
4. อ่านคู่มือเพิ่มเติม:
   - `GOOGLE_APPS_SCRIPT_GUIDE.md` (สำหรับ Apps Script)
   - `GOOGLE_SHEETS_IMPORT_GUIDE.md` (สำหรับ Sheets API)

---

**🎉 ระบบพร้อมใช้งานแล้ว!** 

**แนะนำให้ใช้ Google Apps Script** เพราะง่ายกว่า ปลอดภัยกว่า และฟรี!
