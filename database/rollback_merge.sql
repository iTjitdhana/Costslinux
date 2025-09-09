-- Rollback script สำหรับการ merge
-- ใช้เมื่อเกิดปัญหาหลังจากรัน generate_batch_ids.js --merge

-- แทนที่ backup_database_name ด้วยชื่อ database ที่สร้างจากการ backup
-- ตัวอย่าง: esp_tracker_backup_20241201_143022

-- 1. ลบข้อมูลที่ merge เข้ามา (ใช้ offset ที่ใช้ในการ merge)
-- แทนที่ OFFSET_VALUE ด้วยค่า offset ที่ใช้ (เช่น 1000, 2000, etc.)

-- ลบ logs ที่มี work_plan_id ใหม่
DELETE FROM esp_tracker.logs 
WHERE work_plan_id > (SELECT MAX(id) FROM esp_tracker_backup_$(DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s')).work_plans_backup);

-- ลบ work_plans ที่ merge เข้ามา
DELETE FROM esp_tracker.work_plans 
WHERE id > (SELECT MAX(id) FROM esp_tracker_backup_$(DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s')).work_plans_backup);

-- ลบ finished_flags ที่เกี่ยวข้อง
DELETE FROM esp_tracker.finished_flags 
WHERE work_plan_id > (SELECT MAX(id) FROM esp_tracker_backup_$(DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s')).work_plans_backup);

-- ลบ work_plan_operators ที่เกี่ยวข้อง
DELETE FROM esp_tracker.work_plan_operators 
WHERE work_plan_id > (SELECT MAX(id) FROM esp_tracker_backup_$(DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s')).work_plans_backup);

-- ลบ production_batches ที่เกี่ยวข้อง
DELETE FROM esp_tracker.production_batches 
WHERE work_plan_id > (SELECT MAX(id) FROM esp_tracker_backup_$(DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s')).work_plans_backup);

-- 2. อัปเดต AUTO_INCREMENT กลับไปเป็นค่าเดิม
ALTER TABLE esp_tracker.work_plans 
AUTO_INCREMENT = (SELECT MAX(id) + 1 FROM esp_tracker_backup_$(DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s')).work_plans_backup);

-- 3. ตรวจสอบผลลัพธ์
SELECT 
    'Rollback completed' as status,
    NOW() as rollback_time,
    (SELECT COUNT(*) FROM esp_tracker.work_plans) as work_plans_count,
    (SELECT COUNT(*) FROM esp_tracker.logs) as logs_count,
    (SELECT COUNT(*) FROM esp_tracker.production_batches) as production_batches_count;

-- 4. เปรียบเทียบกับ backup
SELECT 
    'Current vs Backup comparison' as comparison,
    (SELECT COUNT(*) FROM esp_tracker.work_plans) as current_work_plans,
    (SELECT COUNT(*) FROM esp_tracker_backup_$(DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s')).work_plans_backup) as backup_work_plans,
    (SELECT COUNT(*) FROM esp_tracker.logs) as current_logs,
    (SELECT COUNT(*) FROM esp_tracker_backup_$(DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s')).logs_backup) as backup_logs;
