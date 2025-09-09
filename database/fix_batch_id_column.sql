-- แก้ไขคอลัมน์ batch_id จาก int เป็น VARCHAR(100)
ALTER TABLE logs MODIFY COLUMN batch_id VARCHAR(100);

-- ตรวจสอบโครงสร้างหลังจากแก้ไข
DESCRIBE logs;

-- ตรวจสอบข้อมูล batch_id ที่มีอยู่
SELECT 
    id,
    work_plan_id,
    batch_id,
    process_number,
    status,
    timestamp
FROM logs 
WHERE batch_id IS NOT NULL
ORDER BY timestamp DESC
LIMIT 5;
