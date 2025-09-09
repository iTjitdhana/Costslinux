-- สร้างตารางใหม่สำหรับระบบคำนวณต้นทุนการผลิต

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
  `yield_percent` decimal(7,2) GENERATED ALWAYS AS (
    CASE 
      WHEN (SELECT SUM(actual_qty) FROM batch_material_usage WHERE batch_id = batch_production_results.batch_id) > 0 
      THEN (total_qty / (SELECT SUM(actual_qty) FROM batch_material_usage WHERE batch_id = batch_production_results.batch_id)) * 100 
      ELSE 0 
    END
  ) STORED,
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
ADD COLUMN `actual_material_cost` decimal(12,2) DEFAULT 0.00 AFTER `output_qty`,
ADD COLUMN `actual_labor_cost` decimal(12,2) DEFAULT 0.00 AFTER `actual_material_cost`,
ADD COLUMN `actual_total_cost` decimal(12,2) GENERATED ALWAYS AS (`actual_material_cost` + `actual_labor_cost` + `loss_cost` + `utility_cost`) STORED,
ADD KEY `idx_batch_id` (`batch_id`),
ADD CONSTRAINT `fk_production_costs_batch` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`);

-- ปรับปรุงตาราง logs (เพิ่ม batch_id)
ALTER TABLE `logs` 
ADD COLUMN `batch_id` int DEFAULT NULL AFTER `work_plan_id`,
ADD KEY `batch_id` (`batch_id`),
ADD CONSTRAINT `fk_logs_batch` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`);

-- สร้าง View สำหรับคำนวณต้นทุน
CREATE VIEW `v_batch_cost_calculation` AS
SELECT 
  pb.id as batch_id,
  pb.batch_code,
  pb.fg_code,
  pb.planned_qty,
  pb.actual_qty,
  pb.start_time,
  pb.end_time,
  pb.status,
  
  -- Material Cost
  COALESCE(SUM(bmu.total_cost), 0) as total_material_cost,
  COALESCE(SUM(bmu.actual_qty), 0) as total_material_qty,
  
  -- Labor Cost (from logs)
  COALESCE(
    (SELECT SUM(
      CASE 
        WHEN l.status = 'stop' AND l_prev.status = 'start' 
        THEN TIMESTAMPDIFF(MINUTE, l_prev.timestamp, l.timestamp)
        ELSE 0 
      END
    ) FROM logs l 
    LEFT JOIN logs l_prev ON l.batch_id = l_prev.batch_id 
      AND l.process_number = l_prev.process_number 
      AND l_prev.timestamp < l.timestamp
    WHERE l.batch_id = pb.id), 0
  ) as total_minutes,
  
  -- Production Results
  COALESCE(bpr.good_qty, 0) as good_qty,
  COALESCE(bpr.defect_qty, 0) as defect_qty,
  COALESCE(bpr.total_qty, 0) as total_qty,
  COALESCE(bpr.yield_percent, 0) as yield_percent,
  
  -- Cost per Unit
  CASE 
    WHEN COALESCE(bpr.total_qty, 0) > 0 
    THEN COALESCE(SUM(bmu.total_cost), 0) / bpr.total_qty 
    ELSE 0 
  END as material_cost_per_unit,
  
  CASE 
    WHEN COALESCE(bpr.total_qty, 0) > 0 
    THEN (COALESCE(SUM(bmu.total_cost), 0) + 
          (COALESCE(
            (SELECT SUM(
              CASE 
                WHEN l.status = 'stop' AND l_prev.status = 'start' 
                THEN TIMESTAMPDIFF(MINUTE, l_prev.timestamp, l.timestamp)
                ELSE 0 
              END
            ) FROM logs l 
            LEFT JOIN logs l_prev ON l.batch_id = l_prev.batch_id 
              AND l.process_number = l_prev.process_number 
              AND l_prev.timestamp < l.timestamp
            WHERE l.batch_id = pb.id), 0) / 60 * 480)) / bpr.total_qty 
    ELSE 0 
  END as total_cost_per_unit

FROM production_batches pb
LEFT JOIN batch_material_usage bmu ON pb.id = bmu.batch_id
LEFT JOIN batch_production_results bpr ON pb.id = bpr.batch_id
GROUP BY pb.id, pb.batch_code, pb.fg_code, pb.planned_qty, pb.actual_qty, 
         pb.start_time, pb.end_time, pb.status, bpr.good_qty, bpr.defect_qty, bpr.total_qty, bpr.yield_percent;

-- สร้าง View สำหรับรายงานต้นทุนรายวัน
CREATE VIEW `v_daily_cost_summary` AS
SELECT 
  DATE(pb.start_time) as production_date,
  COUNT(pb.id) as total_batches,
  SUM(bcc.total_material_cost) as total_material_cost,
  SUM(bcc.total_minutes / 60 * 480) as total_labor_cost,
  SUM(bcc.total_material_cost + (bcc.total_minutes / 60 * 480)) as total_production_cost,
  SUM(bcc.good_qty) as total_good_qty,
  SUM(bcc.defect_qty) as total_defect_qty,
  SUM(bcc.total_qty) as total_output_qty,
  AVG(bcc.yield_percent) as avg_yield_percent,
  CASE 
    WHEN SUM(bcc.total_qty) > 0 
    THEN SUM(bcc.total_material_cost + (bcc.total_minutes / 60 * 480)) / SUM(bcc.total_qty)
    ELSE 0 
  END as avg_cost_per_unit
FROM production_batches pb
LEFT JOIN v_batch_cost_calculation bcc ON pb.id = bcc.batch_id
WHERE pb.status = 'completed'
GROUP BY DATE(pb.start_time)
ORDER BY production_date DESC;
