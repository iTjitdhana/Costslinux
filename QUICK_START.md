# 🚀 คู่มือการใช้งานด่วน - Merge Database

## ปัญหา
ต้องการ merge ข้อมูลจาก `esp_tracker_empty` เข้า `esp_tracker` โดยไม่ให้เกิด ID conflict

## วิธีแก้ไขด่วน

### 1. ตรวจสอบข้อมูล
```bash
node generate_batch_ids.js --check
```

### 2. Backup ข้อมูล (สำคัญ!)
```bash
node backup_database.js
```

### 3. ทำการ merge
```bash
# วิธีที่ 1: ใช้ batch script (Windows)
merge_databases.bat

# วิธีที่ 2: ใช้คำสั่งโดยตรง
node generate_batch_ids.js --merge
```

### 4. ตรวจสอบผลลัพธ์
```bash
node verify_merge.js --detailed
```

## ไฟล์สำคัญ
- `generate_batch_ids.js` - Script หลัก
- `verify_merge.js` - ตรวจสอบผลลัพธ์
- `backup_database.js` - Backup ข้อมูล
- `rollback_database.js` - Rollback หากเกิดปัญหา
- `merge_databases.bat` - Batch script สำหรับ Windows

## ⚠️ ข้อควรระวัง
1. **ทำ backup เสมอ** ก่อน merge
2. ทดสอบใน environment ทดสอบก่อน
3. ตรวจสอบผลลัพธ์หลัง merge
4. บันทึก offset ที่ใช้สำหรับ rollback

## 🆘 หากเกิดปัญหา
1. ใช้ `rollback_database.js --confirm` เพื่อ rollback
2. ตรวจสอบ log error
3. ตรวจสอบ database connection
