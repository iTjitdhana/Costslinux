-- ========================================
-- SQL Queries สำหรับตรวจสอบ Logs
-- ========================================

-- 1. ดูจำนวน logs ทั้งหมด
SELECT 
    'Total Logs Count' as description,
    COUNT(*) as count
FROM logs;

-- 2. ดู logs ทั้งหมด (ไม่มี LIMIT)
SELECT 
    id,
    work_plan_id,
    batch_id,
    process_number,
    status,
    timestamp,
    DATE(timestamp) as date_only,
    TIME(timestamp) as time_only
FROM logs 
ORDER BY timestamp DESC;

-- 3. ดู logs แยกตาม status
SELECT 
    status,
    COUNT(*) as count,
    MIN(timestamp) as earliest,
    MAX(timestamp) as latest
FROM logs 
GROUP BY status
ORDER BY count DESC;

-- 4. ดู logs แยกตามวันที่
SELECT 
    DATE(timestamp) as date,
    COUNT(*) as total_logs,
    SUM(CASE WHEN status = 'start' THEN 1 ELSE 0 END) as start_count,
    SUM(CASE WHEN status = 'stop' THEN 1 ELSE 0 END) as stop_count
FROM logs 
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- 5. ดู logs ที่มี work_plan_id
SELECT 
    'Logs with work_plan_id' as description,
    COUNT(*) as count
FROM logs 
WHERE work_plan_id IS NOT NULL;

-- 6. ดู logs ที่ไม่มี work_plan_id
SELECT 
    'Logs without work_plan_id' as description,
    COUNT(*) as count
FROM logs 
WHERE work_plan_id IS NULL;

-- 7. ดู logs ที่มี batch_id
SELECT 
    'Logs with batch_id' as description,
    COUNT(*) as count
FROM logs 
WHERE batch_id IS NOT NULL;

-- 8. ดู logs ที่ไม่มี batch_id
SELECT 
    'Logs without batch_id' as description,
    COUNT(*) as count
FROM logs 
WHERE batch_id IS NULL;

-- 9. ดู logs แยกตาม work_plan_id
SELECT 
    work_plan_id,
    COUNT(*) as log_count,
    MIN(timestamp) as first_log,
    MAX(timestamp) as last_log
FROM logs 
WHERE work_plan_id IS NOT NULL
GROUP BY work_plan_id
ORDER BY log_count DESC;

-- 10. ดู logs แยกตาม batch_id
SELECT 
    batch_id,
    COUNT(*) as log_count,
    MIN(timestamp) as first_log,
    MAX(timestamp) as last_log
FROM logs 
WHERE batch_id IS NOT NULL
GROUP BY batch_id
ORDER BY log_count DESC;

-- 11. ดู logs แยกตาม process_number
SELECT 
    process_number,
    COUNT(*) as log_count
FROM logs 
WHERE process_number IS NOT NULL
GROUP BY process_number
ORDER BY process_number;

-- 12. ดู logs ล่าสุด 100 รายการ
SELECT 
    id,
    work_plan_id,
    batch_id,
    process_number,
    status,
    timestamp
FROM logs 
ORDER BY timestamp DESC
LIMIT 100;

-- 13. ดู logs เก่าสุด 100 รายการ
SELECT 
    id,
    work_plan_id,
    batch_id,
    process_number,
    status,
    timestamp
FROM logs 
ORDER BY timestamp ASC
LIMIT 100;

-- 14. ดู logs ที่มี work_plan_id และ batch_id
SELECT 
    l.id,
    l.work_plan_id,
    l.batch_id,
    l.process_number,
    l.status,
    l.timestamp,
    wp.job_code,
    wp.production_date
FROM logs l
LEFT JOIN work_plans wp ON l.work_plan_id = wp.id
ORDER BY l.timestamp DESC;

-- 15. ดู logs ที่ไม่มี work_plan_id (orphaned logs)
SELECT 
    id,
    work_plan_id,
    batch_id,
    process_number,
    status,
    timestamp
FROM logs 
WHERE work_plan_id IS NULL
ORDER BY timestamp DESC;

-- 16. ดู logs ที่ซ้ำกัน (ถ้ามี)
SELECT 
    work_plan_id,
    batch_id,
    process_number,
    status,
    timestamp,
    COUNT(*) as duplicate_count
FROM logs 
GROUP BY work_plan_id, batch_id, process_number, status, timestamp
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 17. ดูช่วงเวลาของ logs
SELECT 
    'Date Range' as description,
    MIN(timestamp) as earliest_log,
    MAX(timestamp) as latest_log,
    DATEDIFF(MAX(timestamp), MIN(timestamp)) as days_span
FROM logs;

-- 18. ดู logs แยกตามชั่วโมง
SELECT 
    HOUR(timestamp) as hour,
    COUNT(*) as log_count
FROM logs 
GROUP BY HOUR(timestamp)
ORDER BY hour;

-- 19. ดู logs แยกตามวันในสัปดาห์
SELECT 
    DAYNAME(timestamp) as day_of_week,
    COUNT(*) as log_count
FROM logs 
GROUP BY DAYNAME(timestamp)
ORDER BY FIELD(DAYNAME(timestamp), 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');

-- 20. ดู logs ที่มี process_number > 0
SELECT 
    'Logs with process_number > 0' as description,
    COUNT(*) as count
FROM logs 
WHERE process_number > 0;
