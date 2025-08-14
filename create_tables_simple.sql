-- สร้างตารางใหม่สำหรับระบบคำนวณต้นทุนการผลิต (แบบง่าย)

-- เพิ่ม index ในตาราง fg ก่อน (ถ้ายังไม่มี)
ALTER TABLE `fg` ADD INDEX `idx_fg_code` (`FG_Code`);

-- 1. ตาราง production_batches (ล็อตการผลิต)
CREATE TABLE `production_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `work_plan_id` int NOT NULL,
  `batch_code` varchar(50) NOT NULL,
  `fg_code` varchar(16) NOT NULL,
  `planned_qty` decimal(10,2) NOT NULL,
  `actual_qty` decimal(10,2) DEFAULT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `status` enum('preparing','producing','completed','cancelled') DEFAULT 'preparing',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `work_plan_id` (`work_plan_id`),
  KEY `fg_code` (`fg_code`),
  KEY `idx_batch_code` (`batch_code`),
  KEY `idx_status` (`status`),
  KEY `idx_start_time` (`start_time`),
  CONSTRAINT `fk_production_batches_work_plan` FOREIGN KEY (`work_plan_id`) REFERENCES `work_plans` (`id`),
  CONSTRAINT `fk_production_batches_fg` FOREIGN KEY (`fg_code`) REFERENCES `fg` (`FG_Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางล็อตการผลิต';

-- 2. ตาราง batch_material_usage (การใช้วัตถุดิบจริง)
CREATE TABLE `batch_material_usage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `material_id` int NOT NULL,
  `planned_qty` decimal(10,2) NOT NULL,
  `actual_qty` decimal(10,2) NOT NULL,
  `unit` varchar(16) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_cost` decimal(12,2) GENERATED ALWAYS AS (`actual_qty` * `unit_price`) STORED,
  `weighed_by` int DEFAULT NULL,
  `weighed_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `batch_id` (`batch_id`),
  KEY `material_id` (`material_id`),
  KEY `idx_weighed_by` (`weighed_by`),
  KEY `idx_weighed_at` (`weighed_at`),
  CONSTRAINT `fk_batch_material_usage_batch` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_batch_material_usage_material` FOREIGN KEY (`material_id`) REFERENCES `material` (`id`),
  CONSTRAINT `fk_batch_material_usage_user` FOREIGN KEY (`weighed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางการใช้วัตถุดิบจริงในล็อตการผลิต';

-- 3. ตาราง batch_production_results (ผลผลิตจริง)
CREATE TABLE `batch_production_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `fg_code` varchar(16) NOT NULL,
  `good_qty` decimal(10,2) NOT NULL DEFAULT 0,
  `defect_qty` decimal(10,2) NOT NULL DEFAULT 0,
  `total_qty` decimal(10,2) GENERATED ALWAYS AS (`good_qty` + `defect_qty`) STORED,
  `recorded_by` int DEFAULT NULL,
  `recorded_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_id` (`batch_id`),
  KEY `fg_code` (`fg_code`),
  KEY `idx_recorded_by` (`recorded_by`),
  KEY `idx_recorded_at` (`recorded_at`),
  CONSTRAINT `fk_batch_production_results_batch` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_batch_production_results_fg` FOREIGN KEY (`fg_code`) REFERENCES `fg` (`FG_Code`),
  CONSTRAINT `fk_batch_production_results_user` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางผลผลิตจริงของล็อตการผลิต';

-- ปรับปรุงตาราง production_costs (เพิ่ม batch_id)
ALTER TABLE `production_costs` 
ADD COLUMN `batch_id` int DEFAULT NULL AFTER `work_plan_id`,
ADD KEY `idx_batch_id` (`batch_id`),
ADD CONSTRAINT `fk_production_costs_batch` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`);

-- ปรับปรุงตาราง logs (เพิ่ม batch_id แบบปลอดภัย)
ALTER TABLE `logs` 
ADD COLUMN `batch_id` int DEFAULT NULL AFTER `work_plan_id`;

-- เพิ่ม Foreign Key หลังจากมั่นใจว่าระบบทำงานปกติแล้ว
-- ALTER TABLE `logs` 
-- ADD KEY `batch_id` (`batch_id`),
-- ADD CONSTRAINT `fk_logs_batch` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`);
