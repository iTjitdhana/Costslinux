# คู่มือการ Merge ข้อมูลระหว่าง esp_tracker และ esp_tracker_empty

## ปัญหาที่ต้องแก้ไข

คุณมีสอง database:
- **esp_tracker** (database ปัจจุบันที่ใช้งานอยู่)
- **esp_tracker_empty** (database เก่าที่มีข้อมูล logs และ work_plans)

ปัญหาคือ:
1. ข้อมูล logs และ work_plans ในทั้งสอง database มี ID ซ้ำกัน
2. logs table มี foreign key `work_plan_id` ที่อ้างอิงไปยัง `work_plans.id`
3. การ merge ข้อมูลโดยตรงจะทำให้เกิด ID conflict

## วิธีแก้ไข

เราได้สร้าง script ที่จะ:
1. ใช้ offset เพื่อเลื่อน work_plan_id ให้ไม่ซ้ำกัน
2. อัปเดต logs ให้อ้างอิง work_plan_id ใหม่
3. ตรวจสอบข้อมูลซ้ำก่อน insert
4. สร้าง backup และ rollback script

## ขั้นตอนการใช้งาน

### 1. ตรวจสอบข้อมูลก่อน merge

```bash
node generate_batch_ids.js --check
```

คำสั่งนี้จะ:
- แสดงจำนวนข้อมูลในแต่ละ database
- ตรวจสอบ work_plans ที่ซ้ำกัน
- แสดงสถานะข้อมูลปัจจุบัน

### 2. Backup ข้อมูล (แนะนำ)

ก่อนทำการ merge ควร backup ข้อมูลปัจจุบัน:

```sql
-- รันไฟล์ backup_before_merge.sql ใน MySQL
source backup_before_merge.sql
```

### 3. ทำการ merge ข้อมูล

```bash
node generate_batch_ids.js --merge
```

คำสั่งนี้จะ:
- หา work_plan_id สูงสุดใน database ปัจจุบัน
- เพิ่ม offset (เช่น +1000) ให้กับ work_plan_id จาก database เก่า
- Insert work_plans ใหม่เข้า database ปัจจุบัน
- อัปเดต logs ให้อ้างอิง work_plan_id ใหม่
- ตรวจสอบข้อมูลซ้ำและข้ามข้อมูลที่มีอยู่แล้ว
- อัปเดต AUTO_INCREMENT ของ work_plans

### 4. ตรวจสอบผลลัพธ์

หลังจาก merge เสร็จ ให้ตรวจสอบ:

```bash
node verify_merge.js
```

หรือสำหรับรายละเอียดเพิ่มเติม:

```bash
node verify_merge.js --detailed
```

คำสั่งนี้จะตรวจสอบ:
- จำนวน work_plans และ logs ทั้งหมด
- ข้อมูลที่ merge เข้ามา
- ความถูกต้องของ foreign key relationships
- ข้อมูลซ้ำ
- ช่วง ID ของข้อมูล
- AUTO_INCREMENT values

## ไฟล์ที่เกี่ยวข้อง

### generate_batch_ids.js
- Script หลักสำหรับ merge ข้อมูล
- มีฟังก์ชัน `checkDataBeforeMerge()` และ `mergeDatabases()`
- รองรับ command line arguments: `--check` และ `--merge`

### verify_merge.js
- Script สำหรับตรวจสอบความถูกต้องของข้อมูลหลัง merge
- ตรวจสอบ foreign key integrity, ข้อมูลซ้ำ, และช่วง ID
- รองรับ command line arguments: `--detailed` สำหรับรายละเอียดเพิ่มเติม

### backup_before_merge.sql
- SQL script สำหรับ backup ข้อมูลก่อน merge
- สร้าง backup database พร้อม timestamp
- Backup tables: work_plans, logs, production_batches, finished_flags, work_plan_operators

### rollback_merge.sql
- SQL script สำหรับ rollback หากเกิดปัญหา
- ลบข้อมูลที่ merge เข้ามา
- อัปเดต AUTO_INCREMENT กลับไปเป็นค่าเดิม

## ความปลอดภัย

### การป้องกันข้อมูลซ้ำ
- ตรวจสอบ work_plans ที่ซ้ำกันโดยใช้ `production_date` และ `job_code`
- ตรวจสอบ logs ที่ซ้ำกันโดยใช้ `work_plan_id`, `batch_id`, `process_number`, `status`, `timestamp`
- ข้ามข้อมูลที่มีอยู่แล้ว

### การจัดการ ID
- ใช้ offset เพื่อเลื่อน work_plan_id ให้ไม่ซ้ำกัน
- อัปเดต AUTO_INCREMENT เพื่อป้องกัน ID ซ้ำในอนาคต
- ตรวจสอบ foreign key constraints

### Backup และ Rollback
- สร้าง backup ก่อน merge
- มี rollback script สำหรับกรณีฉุกเฉิน
- ตรวจสอบข้อมูลหลัง merge

## ตัวอย่างการใช้งาน

```bash
# 1. ตรวจสอบข้อมูล
node generate_batch_ids.js --check

# 2. Backup ข้อมูล (ใน MySQL)
source backup_before_merge.sql

# 3. ทำการ merge
node generate_batch_ids.js --merge

# 4. ตรวจสอบผลลัพธ์
node verify_merge.js --detailed

## การแก้ไขปัญหา

### หากเกิดข้อผิดพลาด
1. ตรวจสอบ log error
2. ใช้ rollback script หากจำเป็น
3. ตรวจสอบ database connection และ permissions

### หากต้องการ rollback
1. ใช้ไฟล์ `rollback_merge.sql`
2. แก้ไขชื่อ backup database ใน script
3. รัน SQL script

## หมายเหตุสำคัญ

- **ทำ backup ก่อน merge เสมอ**
- **ทดสอบใน environment ทดสอบก่อน**
- **ตรวจสอบข้อมูลหลัง merge**
- **บันทึก offset ที่ใช้สำหรับการ rollback**

## การตั้งค่า

ตรวจสอบไฟล์ `config.env` หรือ environment variables:
- `DB_HOST`: MySQL host
- `DB_USER`: MySQL username  
- `DB_PASSWORD`: MySQL password

## Support

หากมีปัญหาหรือคำถาม:
1. ตรวจสอบ log error
2. ตรวจสอบ database connection
3. ตรวจสอบ permissions
4. ใช้ rollback script หากจำเป็น
