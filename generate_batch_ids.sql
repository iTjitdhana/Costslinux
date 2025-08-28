-- Script สำหรับ Generate Batch ID จากข้อมูลที่มีอยู่
-- รูปแบบ: job_code + ปีเดือนวัน(job_name)
-- ตัวอย่าง: 235017+680818(น้ำพริกหนุ่ม)

-- 1. อัปเดต batch_id ในตาราง logs โดยใช้ข้อมูลจาก work_plans
UPDATE logs l
JOIN work_plans wp ON l.work_plan_id = wp.id
SET l.batch_id = CONCAT(
    wp.job_code,
    '+',
    DATE_FORMAT(l.timestamp, '%y%m%d'),
    '(',
    wp.job_name,
    ')'
)
WHERE l.batch_id IS NULL 
  AND l.work_plan_id IS NOT NULL
  AND wp.job_code IS NOT NULL
  AND wp.job_name IS NOT NULL;

-- 2. แสดงผลลัพธ์การอัปเดต
SELECT 
    'อัปเดต batch_id สำเร็จ' as status,
    COUNT(*) as updated_records
FROM logs 
WHERE batch_id IS NOT NULL;

-- 3. แสดงตัวอย่างข้อมูลที่อัปเดตแล้ว
SELECT 
    id,
    work_plan_id,
    batch_id,
    process_number,
    status,
    timestamp,
    DATE_FORMAT(timestamp, '%y%m%d') as formatted_date
FROM logs 
WHERE batch_id IS NOT NULL
ORDER BY timestamp DESC
LIMIT 10;

-- 4. ตรวจสอบข้อมูล work_plans ที่ใช้
SELECT 
    wp.id as work_plan_id,
    wp.job_code,
    wp.job_name,
    COUNT(l.id) as logs_count
FROM work_plans wp
LEFT JOIN logs l ON wp.id = l.work_plan_id
WHERE wp.job_code IS NOT NULL 
  AND wp.job_name IS NOT NULL
GROUP BY wp.id, wp.job_code, wp.job_name
ORDER BY wp.id DESC
LIMIT 10;
