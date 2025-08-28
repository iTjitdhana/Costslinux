-- ตรวจสอบโครงสร้างของตาราง logs
DESCRIBE logs;

-- ตรวจสอบขนาดของคอลัมน์ batch_id
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'esp_tracker' 
  AND TABLE_NAME = 'logs' 
  AND COLUMN_NAME = 'batch_id';

-- ดูตัวอย่างข้อมูล work_plans เพื่อประเมินความยาวของ batch_id
SELECT 
    wp.id,
    wp.job_code,
    wp.job_name,
    LENGTH(wp.job_code) as job_code_length,
    LENGTH(wp.job_name) as job_name_length,
    CONCAT(
        wp.job_code,
        '+',
        DATE_FORMAT(NOW(), '%y%m%d'),
        '(',
        wp.job_name,
        ')'
    ) as sample_batch_id,
    LENGTH(CONCAT(
        wp.job_code,
        '+',
        DATE_FORMAT(NOW(), '%y%m%d'),
        '(',
        wp.job_name,
        ')'
    )) as batch_id_length
FROM work_plans wp
WHERE wp.job_code IS NOT NULL 
  AND wp.job_name IS NOT NULL
ORDER BY batch_id_length DESC
LIMIT 10;
