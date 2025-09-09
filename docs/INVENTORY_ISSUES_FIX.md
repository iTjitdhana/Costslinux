# แก้ไขปัญหาหน้า Inventory

## 🔍 **ปัญหาที่พบ**

### 1. ราคา/หน่วย(ราคากลาง) แสดงเป็น `-` ทั้งหมด
**สาเหตุ**: material_id ที่ใช้ใน BOM ไม่มีราคาใน database `default_itemvalue`

**Material IDs ที่ไม่มีราคา**:
- 8 (น้ำเปล่า)
- 16 (หมูบด - CT)
- 17 (น้ำมันงา ตรามังกรคู่)
- 18 (เกลือปรุงทิพย์ซอง)
- 19 (น้ำตาลทรายขาวบริสุทธิ์)
- 20 (แป้งมันฮ่องกง)
- 21 (ผงฟู)
- 22 (พริกไทยขาวป่น)
- 39 (หมูทรงเครื่อง - FG)

**Material IDs ที่มีราคา**:
- 105001 (กุ้ง 36-40 ตัว/กก.) - ฿240.00
- 105002 (กุ้ง 120 ตัว/กก.) - ฿140.00
- 105004 (ไข่หมึกกล้วย) - ฿120.00
- 105005 (ปูกะตอย 500กรัม) - ฿167.00
- 105006 (ปลาไข่ 70 ตัว/กก) - ฿178.00
- 105007 (เนื้อหอยแมลงภู่) - ฿99.00

### 2. Type แสดงเป็น `I` ทั้งหมด
**สาเหตุ**: Code ใช้ `{field.is_fg ? 'I' : 'M'}` แต่ควรเป็น `'O'` สำหรับวัตถุดิบ

### 3. ลำดับซ้ำ
**สาเหตุ**: ใช้ `{selectedWorkplanObj ? index + 2 : index + 1}` ทำให้ลำดับซ้ำ

## ✅ **การแก้ไขที่ทำ**

### 1. แก้ไข Price Loading Logic
```javascript
// ❌ เดิม
useEffect(() => {
    const mats = (fields || []).map((f, idx) => ({
        material_id: f.material_id,
        unit: f.unit
    }));
    loadLatestPricesForMaterials(mats);
}, [fields.length]);

// ✅ ใหม่
useEffect(() => {
    const materialIds = (fields || [])
        .map(f => f.material_id)
        .filter(id => id && Number.isFinite(id));
    
    if (materialIds.length > 0) {
        loadLatestPricesForMaterials(materialIds);
    }
}, [fields.map(f => f.material_id).join(',')]);
```

### 2. แก้ไข Type Display
```javascript
// ❌ เดิม
{field.is_fg ? 'I' : 'M'}

// ✅ ใหม่
{field.is_fg ? 'I' : 'O'}
```

### 3. แก้ไขลำดับ
```javascript
// ❌ เดิม
{selectedWorkplanObj ? index + 2 : index + 1}

// ✅ ใหม่
{index + 1}
```

### 4. ปรับปรุง Price Display Logic
```javascript
// ✅ เพิ่มการตรวจสอบหน่วยและแปลงราคา
{(() => {
    const p = latestPrices[field.material_id];
    if (!p) return '-';
    
    // ตรวจสอบหน่วยและแปลงราคา
    let price = p.price_per_unit;
    if (p.display_unit !== field.unit) {
        // แปลงราคาตามอัตราส่วนหน่วย
        price = p.price_per_base_unit * (p.display_to_base_rate || 1);
    }
    
    return formatCurrency(Number(price || 0));
})()}
```

### 5. เพิ่ม Debug Logging
```javascript
console.log('Loading prices for material_ids:', ids);
console.log('Loaded prices:', map);
```

## 🎯 **ผลลัพธ์หลังแก้ไข**

### ✅ **ที่แก้ไขได้**
- Type จะแสดงเป็น `O` สำหรับวัตถุดิบ, `I` สำหรับ FG
- ลำดับจะไม่ซ้ำ (1, 2, 3, 4, 5, 6)
- Price loading logic จะทำงานถูกต้อง
- มี debug logging เพื่อตรวจสอบ

### ⚠️ **ที่ยังแก้ไม่ได้**
- ราคา/หน่วย(ราคากลาง) ยังแสดงเป็น `-` เพราะ material_id ใน BOM ไม่มีราคาใน database `default_itemvalue`

## 🔧 **วิธีแก้ปัญหาราคา**

### ตัวเลือก 1: เพิ่มราคาใน database `default_itemvalue`
```sql
INSERT INTO default_itemvalue.default_itemvalue 
(material_id, material_name, display_unit, base_unit, price_per_unit, currency, effective_date)
VALUES 
(8, 'น้ำเปล่า', 'กก.', 'กก.', 0.00, 'THB', NOW()),
(16, 'หมูบด - CT', 'กก.', 'กก.', 120.00, 'THB', NOW()),
(17, 'น้ำมันงา ตรามังกรคู่', 'กก.', 'กก.', 85.00, 'THB', NOW()),
-- ... เพิ่มราคาสำหรับ material_id อื่นๆ
```

### ตัวเลือก 2: ใช้ราคาจากตาราง `material` ใน `esp_tracker`
```javascript
// แก้ไข BOM query ให้ดึงราคาจากตาราง material
const bomSql = `
    SELECT DISTINCT
        fb.Raw_Code,
        fb.Raw_Qty,
        fb.FG_Code,
        m.id as material_id,
        m.Mat_Name,
        m.Mat_Unit,
        COALESCE(m.price, 0) as price,  // ใช้ราคาจากตาราง material
        0 as is_fg
    FROM fg_bom fb
    JOIN material m ON fb.Raw_Code COLLATE utf8mb4_unicode_ci = m.Mat_Id COLLATE utf8mb4_unicode_ci
    WHERE fb.FG_Code = ?
`;
```

## 📁 **ไฟล์ที่แก้ไข**

1. **frontend/src/pages/InventoryData.js**
   - แก้ไข price loading logic
   - แก้ไข Type display
   - แก้ไขลำดับ
   - ปรับปรุง price display logic
   - เพิ่ม debug logging

## 🧪 **การทดสอบ**

1. เปิดหน้า http://localhost:3014/adminOperation/inventory
2. เลือกงานที่มี BOM
3. ตรวจสอบว่า:
   - Type แสดงเป็น `O` สำหรับวัตถุดิบ
   - ลำดับไม่ซ้ำ
   - เปิด Console (F12) เพื่อดู debug logs
   - ราคา/หน่วย(ราคากลาง) อาจยังแสดงเป็น `-` (ขึ้นอยู่กับข้อมูลใน database)
