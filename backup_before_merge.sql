-- Backup script สำหรับข้อมูลก่อน merge
-- ใช้ก่อนรัน generate_batch_ids.js --merge

-- 1. สร้าง backup database
CREATE DATABASE IF NOT EXISTS esp_tracker_backup_$(DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s'));

-- 2. Backup work_plans table
CREATE TABLE esp_tracker_backup_$(DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s')).work_plans_backup AS 
SELECT * FROM esp_tracker.work_plans;

-- 3. Backup logs table  
CREATE TABLE esp_tracker_backup_$(DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s')).logs_backup AS 
SELECT * FROM esp_tracker.logs;

-- 4. Backup production_batches table (ถ้ามี)
CREATE TABLE esp_tracker_backup_$(DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s')).production_batches_backup AS 
SELECT * FROM esp_tracker.production_batches;

-- 5. Backup finished_flags table
CREATE TABLE esp_tracker_backup_$(DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s')).finished_flags_backup AS 
SELECT * FROM esp_tracker.finished_flags;

-- 6. Backup work_plan_operators table (ถ้ามี)
CREATE TABLE esp_tracker_backup_$(DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s')).work_plan_operators_backup AS 
SELECT * FROM esp_tracker.work_plan_operators;

-- 7. สร้างรายงาน backup
SELECT 
    'Backup completed' as status,
    NOW() as backup_time,
    (SELECT COUNT(*) FROM esp_tracker.work_plans) as work_plans_count,
    (SELECT COUNT(*) FROM esp_tracker.logs) as logs_count,
    (SELECT COUNT(*) FROM esp_tracker.production_batches) as production_batches_count;
