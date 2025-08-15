-- ตรวจสอบ logs ของ work_plan_id 482
SELECT 
    id,
    work_plan_id,
    batch_id,
    process_number,
    status,
    timestamp,
    LAG(timestamp) OVER (PARTITION BY process_number ORDER BY timestamp) as prev_timestamp,
    LAG(status) OVER (PARTITION BY process_number ORDER BY timestamp) as prev_status
FROM logs 
WHERE work_plan_id = 482
ORDER BY process_number, timestamp;

-- คำนวณเวลาที่ใช้แบบละเอียด
WITH time_calc AS (
    SELECT
        process_number,
        status,
        timestamp,
        LAG(status) OVER (PARTITION BY process_number ORDER BY timestamp) as prev_status,
        LAG(timestamp) OVER (PARTITION BY process_number ORDER BY timestamp) as prev_timestamp
    FROM logs 
    WHERE work_plan_id = 482
)
SELECT 
    process_number,
    status,
    timestamp,
    prev_status,
    prev_timestamp,
    CASE 
        WHEN status = 'stop' AND prev_status = 'start' 
        THEN TIMESTAMPDIFF(MINUTE, prev_timestamp, timestamp)
        ELSE 0 
    END as duration_minutes
FROM time_calc
ORDER BY process_number, timestamp;

-- สรุปเวลารวม
SELECT 
    SUM(
        CASE 
            WHEN status = 'stop' AND prev_status = 'start' 
            THEN TIMESTAMPDIFF(MINUTE, prev_timestamp, timestamp)
            ELSE 0 
        END
    ) as total_minutes
FROM (
    SELECT
        status,
        timestamp,
        LAG(status) OVER (PARTITION BY process_number ORDER BY timestamp) as prev_status,
        LAG(timestamp) OVER (PARTITION BY process_number ORDER BY timestamp) as prev_timestamp
    FROM logs 
    WHERE work_plan_id = 482
) time_data;
