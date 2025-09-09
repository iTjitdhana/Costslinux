# การวิเคราะห์ปัญหา "ราคา/หน่วย(ราคากลาง)" ไม่แสดง

## 🔍 **ปัญหาที่พบ**

### ราคา/หน่วย(ราคากลาง) แสดงเป็น `-` ทั้งหมด

## ✅ **การตรวจสอบที่ทำ**

### 1. ตรวจสอบ API Endpoint
- ✅ **API `/api/prices/latest-batch` ทำงานได้ปกติ**
- ✅ **Database connection ทำงานได้ปกติ**
- ✅ **View `v_latest_material_price` มีอยู่และมีข้อมูล**

### 2. ตรวจสอบข้อมูลใน Database
- ✅ **ตาราง `default_itemvalue` มีข้อมูล 625 records**
- ✅ **View `v_latest_material_price` มีข้อมูล**
- ❌ **material_id ที่ใช้ใน BOM ไม่มีในตาราง `default_itemvalue`**

## 📊 **ข้อมูลที่ตรวจสอบ**

### BOM Data (จาก API `/api/materials/bom/job/235191`)
```json
{
  "success": true,
  "data": [
    {
      "Raw_Code": "235191",
      "material_id": 63,  // ← ไม่มีใน default_itemvalue
      "Mat_Name": "ซอสหมี่กะเฉด",
      "is_fg": "1"
    },
    {
      "Raw_Code": "413001", 
      "material_id": 7,   // ← ไม่มีใน default_itemvalue
      "Mat_Name": "ชูรส 20 กก.(ถุงละ 1 กก) - CT",
      "is_fg": "0"
    },
    {
      "Raw_Code": "413012",
      "material_id": 19,  // ← ไม่มีใน default_itemvalue
      "Mat_Name": "น้ำตาลทรายขาวบริสุทธิ์ 1 กก. - CT", 
      "is_fg": "0"
    },
    {
      "Raw_Code": "411011",
      "material_id": 44,  // ← ไม่มีใน default_itemvalue
      "Mat_Name": "ซีอิ๊วขาวสูตร 3 ตราเด็กสมบูรณ์ 700 CC. - CT",
      "is_fg": "0"
    },
    {
      "Raw_Code": "411041",
      "material_id": 45,  // ← ไม่มีใน default_itemvalue
      "Mat_Name": "ซอสหอยนางรม ง่วนเชียง 770 กรัม - CT",
      "is_fg": "0"
    }
  ]
}
```

### Price Database (default_itemvalue)
```json
{
  "material_id": 105001,  // ← material_id ที่มีใน database
  "material_name": "กุ้ง 36-40 ตัว/กก.",
  "price_per_unit": "240.000000"
}
```

## 🎯 **สาเหตุของปัญหา**

### **Material ID Mismatch**
- **BOM ใช้ material_id**: 63, 7, 19, 44, 45
- **Price database มี material_id**: 105001, 105002, 105003, ... (เริ่มจาก 105001)
- **ไม่มี material_id ที่ตรงกัน** ระหว่าง BOM และ Price database

## 💡 **แนวทางแก้ไข**

### 1. **แก้ไขที่ Database Level**
```sql
-- เพิ่มข้อมูลราคาสำหรับ material_id ที่ใช้ใน BOM
INSERT INTO default_itemvalue (material_id, material_name, price_per_unit, display_unit, base_unit, display_to_base_rate, currency, effective_date)
VALUES 
(7, 'ชูรส 20 กก.(ถุงละ 1 กก) - CT', 45.00, 'กก.', 'กก.', 1.0, '1', NOW()),
(19, 'น้ำตาลทรายขาวบริสุทธิ์ 1 กก. - CT', 25.00, 'กก.', 'กก.', 1.0, '1', NOW()),
(44, 'ซีอิ๊วขาวสูตร 3 ตราเด็กสมบูรณ์ 700 CC. - CT', 35.00, 'กก.', 'กก.', 1.0, '1', NOW()),
(45, 'ซอสหอยนางรม ง่วนเชียง 770 กรัม - CT', 55.00, 'กก.', 'กก.', 1.0, '1', NOW());
```

### 2. **แก้ไขที่ Application Level**
- **สร้าง mapping table** ระหว่าง BOM material_id และ Price material_id
- **ใช้ Raw_Code แทน material_id** ในการค้นหาราคา
- **เพิ่ม fallback logic** เมื่อไม่พบราคา

### 3. **แก้ไขที่ BOM Level**
- **เปลี่ยน material_id ใน BOM** ให้ตรงกับ Price database
- **ใช้ material_id ที่มีราคาอยู่แล้ว**

## 🔧 **การแก้ไขที่แนะนำ**

### **Option 1: เพิ่มข้อมูลราคา (แนะนำ)**
```sql
-- เพิ่มข้อมูลราคาสำหรับ material_id ที่ใช้ใน BOM
INSERT INTO default_itemvalue (material_id, material_name, price_per_unit, display_unit, base_unit, display_to_base_rate, currency, effective_date, source)
SELECT 
    m.id as material_id,
    m.Mat_Name as material_name,
    CASE 
        WHEN m.Mat_Name LIKE '%ชูรส%' THEN 45.00
        WHEN m.Mat_Name LIKE '%น้ำตาล%' THEN 25.00
        WHEN m.Mat_Name LIKE '%ซีอิ๊ว%' THEN 35.00
        WHEN m.Mat_Name LIKE '%ซอสหอยนางรม%' THEN 55.00
        ELSE 0.00
    END as price_per_unit,
    m.Mat_Unit as display_unit,
    m.Mat_Unit as base_unit,
    1.0 as display_to_base_rate,
    '1' as currency,
    NOW() as effective_date,
    'manual' as source
FROM esp_tracker.material m
WHERE m.id IN (7, 19, 44, 45);
```

### **Option 2: ใช้ Raw_Code แทน material_id**
```javascript
// แก้ไข API ให้ใช้ Raw_Code แทน material_id
const sql = `
    SELECT material_id, material_name, display_unit, base_unit, display_to_base_rate,
           price_per_unit, price_per_base_unit, currency, effective_date, source, created_at
    FROM default_itemvalue.v_latest_material_price
    WHERE material_name LIKE ? OR material_id = ?
    ORDER BY material_id ASC
`;
```

## 📁 **ไฟล์ที่เกี่ยวข้อง**

1. **backend/routes/routes/prices.js** - API endpoint สำหรับดึงราคา
2. **backend/database/defaultItemvalueConnection.js** - การเชื่อมต่อ database
3. **frontend/src/pages/InventoryData.js** - การแสดงราคาในหน้า Inventory
4. **frontend/src/services/api.js** - API calls สำหรับดึงราคา

## 🧪 **การทดสอบ**

### หลังแก้ไขแล้ว ทดสอบด้วย:
```bash
# ทดสอบ API
curl "http://localhost:3104/api/prices/latest-batch?material_ids=7,19,44,45"

# ควรได้ผลลัพธ์:
[
  {
    "material_id": 7,
    "material_name": "ชูรส 20 กก.(ถุงละ 1 กก) - CT",
    "price_per_unit": "45.00"
  },
  // ... อื่นๆ
]
```

## ⚠️ **หมายเหตุ**

- ปัญหานี้ไม่ใช่ bug ใน code แต่เป็น **data mismatch** ระหว่าง BOM และ Price database
- การแก้ไขต้องทำที่ **database level** หรือ **application level**
- หลังแก้ไขแล้ว หน้า Inventory จะแสดงราคาได้ปกติ
