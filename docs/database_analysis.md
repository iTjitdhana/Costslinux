# การวิเคราะห์และปรับปรุงโครงสร้างฐานข้อมูลสำหรับการคำนวณต้นทุนการผลิต

## Flow การทำงานปัจจุบัน
1. รับงานจาก Workplan → รู้ว่าจะผลิตอะไร (FG)
2. ตวงสูตรจาก BOM → ดูว่าต้องใช้วัตถุดิบอะไรบ้าง
3. บันทึกการตวงจริง → ใส่จำนวนวัตถุดิบที่ใช้จริง
4. คำนวณน้ำหนักรวม → รวมน้ำหนักวัตถุดิบทั้งหมด
5. ผลิต → บันทึกเวลาใน logs
6. ได้ผลผลิต → น้ำหนัก FG ที่ได้จริง
7. คำนวณต้นทุน → จากข้อมูลทั้งหมด

## ตารางที่ต้องเพิ่มใหม่

### 1. ตาราง `production_batches` (ล็อตการผลิต)
```sql
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
  CONSTRAINT `fk_production_batches_work_plan` FOREIGN KEY (`work_plan_id`) REFERENCES `work_plans` (`id`),
  CONSTRAINT `fk_production_batches_fg` FOREIGN KEY (`fg_code`) REFERENCES `fg` (`FG_Code`)
);
```

### 2. ตาราง `batch_material_usage` (การใช้วัตถุดิบจริง)
```sql
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
  CONSTRAINT `fk_batch_material_usage_batch` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`),
  CONSTRAINT `fk_batch_material_usage_material` FOREIGN KEY (`material_id`) REFERENCES `material` (`id`)
);
```

### 3. ตาราง `batch_production_results` (ผลผลิตจริง)
```sql
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
  CONSTRAINT `fk_batch_production_results_batch` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`),
  CONSTRAINT `fk_batch_production_results_fg` FOREIGN KEY (`fg_code`) REFERENCES `fg` (`FG_Code`)
);
```

## ตารางที่ต้องปรับปรุง

### 1. ปรับตาราง `production_costs`
```sql
ALTER TABLE `production_costs` 
ADD COLUMN `batch_id` int DEFAULT NULL AFTER `work_plan_id`,
ADD COLUMN `actual_material_cost` decimal(12,2) DEFAULT 0.00 AFTER `output_qty`,
ADD COLUMN `actual_labor_cost` decimal(12,2) DEFAULT 0.00 AFTER `actual_material_cost`,
ADD COLUMN `actual_total_cost` decimal(12,2) GENERATED ALWAYS AS (`actual_material_cost` + `actual_labor_cost` + `loss_cost` + `utility_cost`) STORED,
ADD KEY `idx_batch_id` (`batch_id`),
ADD CONSTRAINT `fk_production_costs_batch` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`);
```

### 2. ปรับตาราง `logs`
```sql
ALTER TABLE `logs` 
ADD COLUMN `batch_id` int DEFAULT NULL AFTER `work_plan_id`,
ADD KEY `batch_id` (`batch_id`),
ADD CONSTRAINT `fk_logs_batch` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`);
```

## View สำหรับคำนวณต้นทุน

### View `v_batch_cost_calculation`
```sql
CREATE VIEW `v_batch_cost_calculation` AS
SELECT 
  pb.id as batch_id,
  pb.batch_code,
  pb.fg_code,
  pb.planned_qty,
  pb.actual_qty,
  pb.start_time,
  pb.end_time,
  
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
         pb.start_time, pb.end_time, bpr.good_qty, bpr.defect_qty, bpr.total_qty, bpr.yield_percent;
```

## กระบวนการทำงานใหม่

### 1. การเริ่มต้นล็อตการผลิต
```sql
INSERT INTO production_batches (work_plan_id, batch_code, fg_code, planned_qty, start_time)
VALUES (work_plan_id, 'BATCH-2024-001', 'FG001', 100.00, NOW());
```

### 2. การบันทึกการตวงวัตถุดิบ
```sql
INSERT INTO batch_material_usage (batch_id, material_id, planned_qty, actual_qty, unit, unit_price, weighed_by)
VALUES 
(1, 1, 10.0, 10.2, 'kg', 80.00, 1),
(1, 2, 5.0, 5.1, 'kg', 120.00, 1);
```

### 3. การบันทึกผลผลิต
```sql
INSERT INTO batch_production_results (batch_id, fg_code, good_qty, defect_qty, recorded_by)
VALUES (1, 'FG001', 95.0, 3.0, 1);
```

### 4. การคำนวณต้นทุน
```sql
SELECT * FROM v_batch_cost_calculation WHERE batch_id = 1;
```

## ประโยชน์ที่ได้

1. **ความแม่นยำ** - ใช้ข้อมูลจริงแทนการประมาณการ
2. **ติดตามได้** - รู้ต้นทุนแต่ละล็อตการผลิต
3. **วิเคราะห์ได้** - เปรียบเทียบต้นทุนระหว่างล็อต
4. **ควบคุมคุณภาพ** - ติดตาม Yield และ Defect
5. **วางแผนได้** - ใช้ข้อมูลจริงในการวางแผนการผลิตครั้งต่อไป
