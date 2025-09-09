# คู่มือการตั้งค่า Google Sheets API

## ขั้นตอนที่ 1: สร้าง Google Cloud Project

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้างโปรเจคใหม่หรือเลือกโปรเจคที่มีอยู่
3. เปิดใช้งาน Google Sheets API:
   - ไปที่ "APIs & Services" > "Library"
   - ค้นหา "Google Sheets API"
   - คลิก "Enable"

## ขั้นตอนที่ 2: สร้าง Service Account

1. ไปที่ "APIs & Services" > "Credentials"
2. คลิก "Create Credentials" > "Service Account"
3. กรอกข้อมูล:
   - Service account name: `sheets-import-service`
   - Service account ID: จะสร้างอัตโนมัติ
   - Description: `Service account for importing Google Sheets data`
4. คลิก "Create and Continue"
5. ข้ามขั้นตอน "Grant this service account access to project"
6. คลิก "Done"

## ขั้นตอนที่ 3: สร้าง Key

1. คลิกที่ Service Account ที่สร้างขึ้น
2. ไปที่แท็บ "Keys"
3. คลิก "Add Key" > "Create new key"
4. เลือก "JSON"
5. คลิก "Create"
6. ไฟล์ JSON จะดาวน์โหลดอัตโนมัติ

## ขั้นตอนที่ 4: แชร์ Google Sheets

1. เปิด Google Sheets ที่ต้องการ import ข้อมูล
2. คลิก "Share" (มุมขวาบน)
3. เพิ่ม email ของ Service Account (จากไฟล์ JSON)
4. ให้สิทธิ์ "Editor"

## ขั้นตอนที่ 5: ตั้งค่าไฟล์

1. เปลี่ยนชื่อไฟล์ JSON เป็น `google-sheets-credentials.json`
2. ย้ายไฟล์ไปที่โฟลเดอร์ `scripts/`
3. เพิ่มใน `.gitignore`:
   ```
   scripts/google-sheets-credentials.json
   ```

## ขั้นตอนที่ 6: ตั้งค่า Environment Variables

เพิ่มในไฟล์ `config.env`:
```
# Google Sheets Configuration
GOOGLE_SHEETS_CREDENTIALS_PATH=scripts/google-sheets-credentials.json
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
```

## หมายเหตุ

- Spreadsheet ID คือส่วนของ URL ระหว่าง /d/ และ /edit
- ตัวอย่าง: https://docs.google.com/spreadsheets/d/`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`/edit
- Spreadsheet ID คือ: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`





