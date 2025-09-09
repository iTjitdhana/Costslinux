# 🚀 คู่มือการใช้งาน Google Apps Script

## ภาพรวม

**Google Apps Script** เป็นทางเลือกที่ดีกว่า Google Sheets API เพราะ:
- ✅ **ง่ายกว่า** - ไม่ต้องตั้งค่า API credentials
- ✅ **ปลอดภัยกว่า** - ทำงานใน Google Cloud โดยตรง
- ✅ **ฟรี** - ไม่มีค่าใช้จ่าย
- ✅ **รวดเร็ว** - ไม่มี rate limits
- ✅ **ยืดหยุ่น** - สามารถปรับแต่งได้ตามต้องการ
- ✅ **ไม่ต้องใช้ API Key** - ใช้ Google Account authentication

## 📋 ขั้นตอนการตั้งค่า

### 1. สร้าง Google Apps Script

1. **เปิด Google Sheets** ที่ต้องการ import ข้อมูล
2. **ไปที่ Extensions** > **Apps Script**
3. **แทนที่โค้ดเริ่มต้น** ด้วยโค้ดจาก `scripts/google-apps-script-code.gs`
4. **แก้ไขการตั้งค่า** ในส่วน `CONFIG`:
   ```javascript
   const CONFIG = {
     // Sheet name to read data from (change this to your sheet name)
     SHEET_NAME: 'Sheet1',                 // เปลี่ยนเป็นชื่อ sheet ของคุณ
     DATA_RANGE: 'A:J',                    // เปลี่ยนเป็นช่วงข้อมูลของคุณ
     HEADER_ROW: 1                         // แถวที่มี headers
   };
   ```

### 2. Deploy เป็น Web App

1. **คลิก "Deploy"** > **"New deployment"**
2. **เลือก "Web app"**
3. **ตั้งค่า:**
   - **Execute as:** "Me"
   - **Who has access:** "Anyone"
4. **คลิก "Deploy"**
5. **คัดลอก Web App URL** ที่ได้

### 3. ตั้งค่า Environment Variables

แก้ไขไฟล์ `config.env`:

```env
# Google Apps Script Configuration (No API Key needed!)
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### 4. ทดสอบการทำงาน

```bash
npm run import-apps-script
```

## 🔧 การปรับแต่ง Google Apps Script

### การเปลี่ยนชื่อ Sheet

```javascript
const CONFIG = {
  SHEET_NAME: 'YourSheetName',  // เปลี่ยนเป็นชื่อ sheet ของคุณ
  // ... other config
};
```

### การเปลี่ยนช่วงข้อมูล

```javascript
const CONFIG = {
  DATA_RANGE: 'A:Z',  // เปลี่ยนเป็นช่วงที่ต้องการ
  // ... other config
};
```

## 🧪 การทดสอบ

### 1. ทดสอบใน Apps Script Editor

1. **เปิด Apps Script Editor**
2. **เลือกฟังก์ชัน `testGetData`**
3. **คลิก "Run"**
4. **ตรวจสอบผลลัพธ์ใน Console**

### 2. ทดสอบ Web App URL

1. **เปิด Web App URL** ในเบราว์เซอร์
2. **ควรเห็น JSON response** ที่มีข้อมูลจาก Google Sheets

### 3. ทดสอบจาก Node.js

```bash
npm run import-apps-script
```

## 📊 โครงสร้างข้อมูลที่รองรับ

### Google Sheets Columns:

| คอลัมน์ | คำอธิบาย | ตัวอย่าง |
|---------|----------|----------|
| หมวดหมู่ | ประเภทสินค้า | ทะเลทอด, ของแห้ง |
| รหัสสินค้า | รหัสวัสดุ | 105001, 111001 |
| ชื่อสินค้า | ชื่อวัสดุ | กุ้ง 36-40 ตัว/กก. |
| จํานวนนับ | จำนวน | 84.50 |
| หน่วย | หน่วยวัด | กก., กระปุก, หีบ |
| ราคาทุนต่อหน่วย | ราคาต่อหน่วย | 240.00 |
| มูลค่า | มูลค่ารวม | 20,280.00 |

### Response Format:

```json
{
  "success": true,
  "data": {
    "headers": ["หมวดหมู่", "รหัสสินค้า", "ชื่อสินค้า", ...],
    "data": [
      ["ทะเลทอด", "105001", "กุ้ง 36-40 ตัว/กก.", ...],
      ["ของแห้ง", "111001", "กระเทียมดองแม่จินต์", ...]
    ],
    "totalRows": 30,
    "sheetName": "Sheet1",
    "range": "A:J",
    "lastUpdated": "2025-01-27T10:30:00.000Z"
  },
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

## 🔍 การแก้ไขปัญหา

### ปัญหาที่พบบ่อย:

1. **Sheet not found**
   - ตรวจสอบชื่อ sheet ใน `CONFIG.SHEET_NAME`
   - ตรวจสอบว่าชื่อถูกต้องและมีอยู่จริง

2. **No data found**
   - ตรวจสอบ `CONFIG.DATA_RANGE`
   - ตรวจสอบว่าข้อมูลอยู่ในช่วงที่กำหนด

3. **Web App URL not accessible**
   - ตรวจสอบการตั้งค่า "Who has access" เป็น "Anyone"
   - ตรวจสอบว่า Web App URL ถูกต้อง

### การ Debug:

1. **ใช้ฟังก์ชัน `validateConfig()`** ใน Apps Script Editor
2. **ตรวจสอบ Console logs** ใน Apps Script Editor
3. **ทดสอบ Web App URL** โดยตรงในเบราว์เซอร์

## 🔒 ความปลอดภัย

### Web App Security:

- ✅ **ตั้งค่า "Execute as"** เป็น "Me"
- ✅ **ตั้งค่า "Who has access"** เป็น "Anyone" (ถ้าต้องการ public access)
- ✅ **ใช้ HTTPS** เสมอ
- ✅ **ไม่ต้องใช้ API Key** - ใช้ Google Account authentication

## 📝 ตัวอย่างการใช้งาน

### 1. Import ข้อมูลปกติ:

```bash
npm run import-apps-script
```

### 2. ตรวจสอบโครงสร้างฐานข้อมูล:

```bash
npm run check-structure
```

### 3. ตั้งเวลาอัตโนมัติ (Windows):

```batch
# สร้างไฟล์ batch
echo @echo off > import-apps-script.bat
echo cd /d C:\Cots >> import-apps-script.bat
echo node scripts/import-google-apps-script.js >> import-apps-script.bat
echo pause >> import-apps-script.bat
```

## 🎯 ข้อดีของ Google Apps Script

### เทียบกับ Google Sheets API:

| คุณสมบัติ | Google Apps Script | Google Sheets API |
|-----------|-------------------|-------------------|
| **ความง่าย** | ✅ ง่ายมาก | ❌ ซับซ้อน |
| **การตั้งค่า** | ✅ ไม่ต้องตั้งค่า credentials | ❌ ต้องตั้งค่า Service Account |
| **ค่าใช้จ่าย** | ✅ ฟรี | ❌ มี quota limits |
| **ความเร็ว** | ✅ เร็ว | ⚠️ มี rate limits |
| **ความปลอดภัย** | ✅ ปลอดภัย | ✅ ปลอดภัย |
| **การปรับแต่ง** | ✅ ยืดหยุ่นมาก | ⚠️ จำกัด |
| **API Key** | ✅ ไม่ต้องใช้ | ❌ ต้องใช้ |

## 🚀 ขั้นตอนถัดไป

1. **สร้าง Google Apps Script** ตามคู่มือ
2. **Deploy เป็น Web App**
3. **ตั้งค่า environment variables** (แค่ URL เท่านั้น)
4. **ทดสอบการทำงาน**
5. **รัน import ข้อมูล**

---

**🎉 Google Apps Script พร้อมใช้งาน!** ง่ายกว่าและปลอดภัยกว่า Google Sheets API

**✨ ไม่ต้องใช้ API Key - ใช้แค่ Web App URL เท่านั้น!**
