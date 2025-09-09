-- Insert sample role configurations
INSERT INTO role_configurations (role_name, display_name, color, url_prefix, menu_items) VALUES
('planner', 'Planner', 'blue', '/planner/', '["Dashboard", "Logs การผลิต", "รายงานวิเคราะห์ต้นทุน", "จัดการล็อต", "ตวงวัตถุดิบ"]'),
('admin', 'Admin Operation', 'red', '/admin/', '["Dashboard", "จัดการล็อต", "ตวงวัตถุดิบ", "ผลผลิต", "คำนวณต้นทุน", "รายงาน", "รายงานวิเคราะห์ต้นทุน", "ข้อมูล Inventory", "Logs การผลิต", "Conversion Rates", "จัดการค่าแปลง", "จัดการ Role"]'),
('operator', 'Operator', 'green', '/operator/', '["Dashboard", "Logs การผลิต", "ตวงวัตถุดิบ", "ผลผลิต"]'),
('viewer', 'Viewer', 'gray', '/viewer/', '["Dashboard", "Logs การผลิต", "รายงานวิเคราะห์ต้นทุน"]');

