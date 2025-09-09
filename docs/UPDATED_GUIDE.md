# 🚀 คู่มือการใช้งาน - Merge Database (อัปเดต)

## ปัญหา
ต้องการ merge ข้อมูลจาก `esp_tracker_empty` เข้า `esp_tracker` โดยไม่ให้เกิด ID conflict

## วิธีแก้ไข

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

### Scripts หลัก
- `generate_batch_ids.js` - Script หลักสำหรับ merge ข้อมูล
- `verify_merge.js` - ตรวจสอบความถูกต้องของข้อมูลหลัง merge
- `backup_database.js` - Backup ข้อมูลก่อน merge
- `rollback_database.js` - Rollback หากเกิดปัญหา

### Scripts รอง
- `merge_databases.bat` - Batch script สำหรับ Windows
- `backup_info.json` - ไฟล์เก็บข้อมูล backup (สร้างอัตโนมัติ)

## วิธีใช้งานแบบละเอียด

### การ Backup
```bash
# Backup ข้อมูลปัจจุบัน
node backup_database.js

# ดูรายการ backup ที่มีอยู่
node backup_database.js --list
```

### การ Merge
```bash
# ตรวจสอบข้อมูลก่อน merge
node generate_batch_ids.js --check

# ทำการ merge
node generate_batch_ids.js --merge
```

### การตรวจสอบ
```bash
# ตรวจสอบพื้นฐาน
node verify_merge.js

# ตรวจสอบแบบละเอียด
node verify_merge.js --detailed
```

### การ Rollback
```bash
# Rollback ใช้ backup ล่าสุด
node rollback_database.js --confirm

# Rollback ใช้ backup ที่ระบุ
node rollback_database.js <backup_database_name> --confirm

# ดูรายการ backup
node rollback_database.js --list

# ดูวิธีใช้งาน
node rollback_database.js --help
```

## ตัวอย่างการใช้งานแบบสมบูรณ์

```bash
# 1. ตรวจสอบข้อมูล
node generate_batch_ids.js --check

# 2. Backup ข้อมูล
node backup_database.js

# 3. ทำการ merge
node generate_batch_ids.js --merge

# 4. ตรวจสอบผลลัพธ์
node verify_merge.js --detailed

# 5. หากเกิดปัญหา - Rollback
node rollback_database.js --confirm
```

## ข้อมูลที่แสดง

### การตรวจสอบข้อมูล
- จำนวน work_plans และ logs ในแต่ละ database
- work_plans ที่ซ้ำกัน
- สถานะข้อมูลปัจจุบัน

### การ Backup
- สร้าง backup database พร้อม timestamp
- Backup tables: work_plans, logs, production_batches, finished_flags, work_plan_operators
- บันทึกข้อมูลลงไฟล์ backup_info.json

### การ Merge
- ใช้ offset เพื่อเลื่อน work_plan_id
- ตรวจสอบข้อมูลซ้ำก่อน insert
- อัปเดต AUTO_INCREMENT
- รายงานสรุปการ merge

### การตรวจสอบหลัง Merge
- จำนวนข้อมูลทั้งหมด
- Foreign key integrity
- ข้อมูลซ้ำ
- ช่วง ID ของข้อมูล
- AUTO_INCREMENT values

## ⚠️ ข้อควรระวัง

1. **ทำ backup เสมอ** ก่อน merge
2. ทดสอบใน environment ทดสอบก่อน
3. ตรวจสอบผลลัพธ์หลัง merge
4. บันทึก offset ที่ใช้สำหรับการ rollback
5. เก็บชื่อ backup database ไว้สำหรับ rollback

## 🆘 การแก้ไขปัญหา

### หากเกิดข้อผิดพลาด
1. ตรวจสอบ log error
2. ตรวจสอบ database connection
3. ตรวจสอบ permissions

### หากต้องการ rollback
1. ใช้ `node rollback_database.js --confirm`
2. หรือระบุ backup database: `node rollback_database.js <backup_name> --confirm`

### หากไม่พบ backup
1. ใช้ `node backup_database.js --list` เพื่อดูรายการ backup
2. ใช้ `node rollback_database.js --list` เพื่อดูรายการ backup

## การตั้งค่า

ตรวจสอบไฟล์ `config.env` หรือ environment variables:
- `DB_HOST`: MySQL host (default: 192.168.0.94)
- `DB_USER`: MySQL username (default: jitdhana)
- `DB_PASSWORD`: MySQL password (default: iT12345$)

## หมายเหตุ

- ระบบจะสร้าง backup database ชื่อ `esp_tracker_backup_YYYY-MM-DDTHH-MM-SS`
- ข้อมูล backup จะถูกบันทึกลงไฟล์ `backup_info.json`
- การ rollback จะลบข้อมูลที่มี work_plan_id สูงกว่าค่าใน backup
- ระบบจะตรวจสอบข้อมูลซ้ำและข้ามข้อมูลที่มีอยู่แล้ว
