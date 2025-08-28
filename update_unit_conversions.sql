-- ปรับปรุงตาราง unit_conversions เพื่อรองรับวัตถุดิบแต่ละตัว
USE esp_tracker;

-- Migration: Adjust default_itemvalue schema for price per unit usage
-- Safe to run multiple times

-- 1) Ensure database exists (no-op if already exists)
CREATE DATABASE IF NOT EXISTS `default_itemvalue` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

-- 2) Ensure table exists (no-op if already exists)
CREATE TABLE IF NOT EXISTS `default_itemvalue`.`default_itemvalue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sku_id` int NOT NULL,
  `sku_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku_value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku_unit` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_active` date NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

USE `default_itemvalue`;

-- 3) Add numeric price column and metadata if not present
ALTER TABLE `default_itemvalue`
  ADD COLUMN IF NOT EXISTS `price_per_unit` DECIMAL(18,6) NOT NULL DEFAULT 0.000000 AFTER `sku_unit`,
  ADD COLUMN IF NOT EXISTS `currency` CHAR(3) NOT NULL DEFAULT 'THB' AFTER `price_per_unit`,
  ADD COLUMN IF NOT EXISTS `source` VARCHAR(100) NULL AFTER `currency`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `date_active`;

-- 4) Add indexes for efficient lookups by sku and date
CREATE INDEX IF NOT EXISTS `idx_sku_id_date` ON `default_itemvalue` (`sku_id`, `date_active`);
CREATE INDEX IF NOT EXISTS `idx_sku_unit` ON `default_itemvalue` (`sku_unit`);

-- 5) Optional uniqueness to avoid duplicates per sku/date/unit (comment out if not desired)
-- ALTER TABLE `default_itemvalue`
--   ADD CONSTRAINT `uq_sku_date_unit`
--   UNIQUE (`sku_id`, `sku_unit`, `date_active`);

-- 6) View for latest active price per sku_id and unit
DROP VIEW IF EXISTS `v_latest_sku_price`;
CREATE VIEW `v_latest_sku_price` AS
SELECT t.sku_id,
       t.sku_name,
       t.sku_unit,
       t.price_per_unit,
       t.currency,
       t.date_active,
       t.source,
       t.created_at
FROM `default_itemvalue` t
JOIN (
  SELECT sku_id, sku_unit, MAX(date_active) AS max_date
  FROM `default_itemvalue`
  GROUP BY sku_id, sku_unit
) m ON m.sku_id = t.sku_id
   AND m.sku_unit = t.sku_unit
   AND m.max_date = t.date_active;

-- เพิ่มคอลัมน์ material_name (ถ้ายังไม่มี)
ALTER TABLE unit_conversions 
ADD COLUMN material_name VARCHAR(255) DEFAULT NULL,
ADD COLUMN material_pattern VARCHAR(255) DEFAULT NULL;

-- ลบข้อมูลเก่า (ถ้ามี)
DELETE FROM unit_conversions WHERE from_unit = 'แพ็ค';

-- เพิ่มข้อมูล conversion rates ตามวัตถุดิบจริง
INSERT INTO unit_conversions (from_unit, to_unit, conversion_rate, description, material_name, material_pattern) VALUES
-- Mala Paste ต่างๆ (ตามชื่อวัตถุดิบจริง)
('แพ็ค', 'กก.', 0.150, '1 แพ็ค = 0.150 กก. (150 กรัม)', 'Mala Paste (SanWu)', 'SanWu'),
('แพ็ค', 'กก.', 0.200, '1 แพ็ค = 0.200 กก. (200 กรัม)', 'Mala Paste (ให้ตี๋เหล่า)', 'ให้ตี๋เหล่า'),
('แพ็ค', 'กก.', 0.180, '1 แพ็ค = 0.180 กก. (180 กรัม)', 'Mala Paste ทั่วไป', 'Mala Paste'),

-- วัตถุดิบอื่นๆ ที่ใช้หน่วยแพ็ค
('แพ็ค', 'กก.', 0.100, '1 แพ็ค = 0.100 กก. (100 กรัม)', 'เครื่องปรุงทั่วไป', 'เครื่องปรุง'),
('แพ็ค', 'กก.', 0.250, '1 แพ็ค = 0.250 กก. (250 กรัม)', 'วัตถุดิบหนัก', 'หนัก'),
('แพ็ค', 'กก.', 0.300, '1 แพ็ค = 0.300 กก. (300 กรัม)', 'วัตถุดิบหนักพิเศษ', 'หนักพิเศษ'),

-- วัตถุดิบที่ใช้หน่วยกล่อง
('กล่อง', 'กก.', 0.500, '1 กล่อง = 0.500 กก. (500 กรัม)', 'กล่องเล็ก', 'เล็ก'),
('กล่อง', 'กก.', 1.000, '1 กล่อง = 1.000 กก. (1 กก.)', 'กล่องกลาง', 'กลาง'),
('กล่อง', 'กก.', 2.000, '1 กล่อง = 2.000 กก. (2 กก.)', 'กล่องใหญ่', 'ใหญ่'),

-- วัตถุดิบที่ใช้หน่วยชิ้น
('ชิ้น', 'กก.', 0.100, '1 ชิ้น = 0.100 กก. (100 กรัม)', 'ชิ้นเล็ก', 'เล็ก'),
('ชิ้น', 'กก.', 0.150, '1 ชิ้น = 0.150 กก. (150 กรัม)', 'ชิ้นกลาง', 'กลาง'),
('ชิ้น', 'กก.', 0.200, '1 ชิ้น = 0.200 กก. (200 กรัม)', 'ชิ้นใหญ่', 'ใหญ่'),

-- วัตถุดิบที่ใช้หน่วยขวด
('ขวด', 'กก.', 0.500, '1 ขวด = 0.500 กก. (500 มล.)', 'ขวดเล็ก', 'เล็ก'),
('ขวด', 'กก.', 1.000, '1 ขวด = 1.000 กก. (1 ลิตร)', 'ขวดใหญ่', 'ใหญ่'),

-- วัตถุดิบที่ใช้หน่วยกระปุก
('กระปุก', 'กก.', 0.200, '1 กระปุก = 0.200 กก. (200 กรัม)', 'กระปุกเล็ก', 'เล็ก'),
('กระปุก', 'กก.', 0.300, '1 กระปุก = 0.300 กก. (300 กรัม)', 'กระปุกกลาง', 'กลาง'),
('กระปุก', 'กก.', 0.500, '1 กระปุก = 0.500 กก. (500 กรัม)', 'กระปุกใหญ่', 'ใหญ่'),

-- วัตถุดิบที่ใช้หน่วยถุง
('ถุง', 'กก.', 0.100, '1 ถุง = 0.100 กก. (100 กรัม)', 'ถุงเล็ก', 'เล็ก'),
('ถุง', 'กก.', 0.250, '1 ถุง = 0.250 กก. (250 กรัม)', 'ถุงกลาง', 'กลาง'),
('ถุง', 'กก.', 0.500, '1 ถุง = 0.500 กก. (500 กรัม)', 'ถุงใหญ่', 'ใหญ่'),
('ถุง', 'กก.', 1.000, '1 ถุง = 1.000 กก. (1 กก.)', 'ถุงใหญ่พิเศษ', 'ใหญ่พิเศษ'),

-- วัตถุดิบที่ใช้หน่วยซอง
('ซอง', 'กก.', 0.050, '1 ซอง = 0.050 กก. (50 กรัม)', 'ซองเล็ก', 'เล็ก'),
('ซอง', 'กก.', 0.100, '1 ซอง = 0.100 กก. (100 กรัม)', 'ซองกลาง', 'กลาง'),
('ซอง', 'กก.', 0.150, '1 ซอง = 0.150 กก. (150 กรัม)', 'ซองใหญ่', 'ใหญ่'),

-- วัตถุดิบที่ใช้หน่วยขวดเล็ก
('ขวดเล็ก', 'กก.', 0.250, '1 ขวดเล็ก = 0.250 กก. (250 มล.)', 'ขวดเล็ก', 'เล็ก'),
('ขวดเล็ก', 'กก.', 0.300, '1 ขวดเล็ก = 0.300 กก. (300 มล.)', 'ขวดเล็ก', 'กลาง'),

-- วัตถุดิบที่ใช้หน่วยกระป๋อง
('กระป๋อง', 'กก.', 0.400, '1 กระป๋อง = 0.400 กก. (400 กรัม)', 'กระป๋องเล็ก', 'เล็ก'),
('กระป๋อง', 'กก.', 0.500, '1 กระป๋อง = 0.500 กก. (500 กรัม)', 'กระป๋องใหญ่', 'ใหญ่'),

-- วัตถุดิบที่ใช้หน่วยถ้วย
('ถ้วย', 'กก.', 0.200, '1 ถ้วย = 0.200 กก. (200 กรัม)', 'ถ้วยเล็ก', 'เล็ก'),
('ถ้วย', 'กก.', 0.300, '1 ถ้วย = 0.300 กก. (300 กรัม)', 'ถ้วยใหญ่', 'ใหญ่');

-- ตรวจสอบข้อมูลที่เพิ่ม
SELECT * FROM unit_conversions ORDER BY from_unit, material_name, conversion_rate;
