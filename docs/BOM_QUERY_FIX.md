# แก้ไข BOM Query ให้ดึงข้อมูลจริงจากตาราง fg และ fg_bom

## 🔧 การเปลี่ยนแปลง

### ปัญหาเดิม
```javascript
// ❌ ใช้ parameter และข้อมูลจำลอง
const fgSql = `
    SELECT DISTINCT
        ? as Raw_Code,        // ใช้ parameter
        1 as Raw_Qty,         // จำนวนคงที่
        ? as FG_Code,         // ใช้ parameter
        ? as material_id,     // ใช้ parameter (0)
        wp.job_name as Mat_Name,
        'ชิ้น' as Mat_Unit,   // หน่วยคงที่
        0 as price,           // ราคาเป็น 0
        1 as is_fg
    FROM work_plans wp
    WHERE wp.job_code = ?
`;
```

### หลังแก้ไข
```javascript
// ✅ ดึงข้อมูลจริงจากตาราง fg และ fg_bom
const fgSql = `
    SELECT DISTINCT
        fg.FG_Code as Raw_Code,      // ใช้ข้อมูลจริง
        1 as Raw_Qty,
        fg.FG_Code,
        fg.id as material_id,        // ใช้ ID จริง
        fg.FG_Name as Mat_Name,      // ใช้ชื่อจริง
        fg.FG_Unit as Mat_Unit,      // ใช้หน่วยจริง
        0 as price,                  // ราคาจะดึงจาก database อื่น
        1 as is_fg
    FROM fg fg
    JOIN work_plans wp ON fg.FG_Code COLLATE utf8mb4_unicode_ci = wp.job_code COLLATE utf8mb4_unicode_ci
    WHERE wp.job_code = ?
`;

// ✅ ดึง BOM จากตาราง fg_bom
const bomSql = `
    SELECT DISTINCT
        fb.Raw_Code,
        fb.Raw_Qty,
        fb.FG_Code,
        m.id as material_id,
        m.Mat_Name,
        m.Mat_Unit,
        COALESCE(m.price, 0) as price,
        0 as is_fg
    FROM fg_bom fb
    JOIN material m ON fb.Raw_Code COLLATE utf8mb4_unicode_ci = m.Mat_Id COLLATE utf8mb4_unicode_ci
    WHERE fb.FG_Code = ?
`;
```

## 📋 การปรับปรุงเพิ่มเติม

### 1. เพิ่ม Error Handling
```javascript
// ตรวจสอบว่าพบข้อมูล FG หรือไม่
if (fgData.length === 0) {
    console.warn(`No FG found for job_code: ${jobCode}`);
}
```

### 2. เพิ่ม COALESCE สำหรับราคา
```javascript
// ใน BOM query
COALESCE(m.price, 0) as price
```

### 3. เพิ่ม Debug Logging
```javascript
if (process.env.NODE_ENV === 'development') {
    console.log(`BOM loaded for job_code: ${jobCode}`, {
        fg_count: fgData.length,
        bom_count: bomItems.length,
        total_count: allItems.length
    });
}
```

## 🧪 การทดสอบ

### รันการทดสอบ
```bash
# ทดสอบ BOM Query
node test_bom_query.js

# ทดสอบ Price Query
node test_price_query.js
```

### ผลลัพธ์การทดสอบ BOM
```
📋 Testing job_code: 235030

1️⃣ Testing FG Query:
FG Data: [
  {
    Raw_Code: '235030',
    Raw_Qty: '1',
    FG_Code: '235030',
    material_id: 39,
    Mat_Name: 'หมูทรงเครื่อง',
    Mat_Unit: 'กก.',
    price: '0',
    is_fg: '1'
  }
]

2️⃣ Testing BOM Query:
BOM Items: [
  {
    Raw_Code: '206004',
    Raw_Qty: 0.30000001192092896,
    FG_Code: '235030',
    material_id: 8,
    Mat_Name: 'น้ำเปล่า',
    Mat_Unit: 'กก.',
    price: '0.00',
    is_fg: '0'
  },
  // ... วัตถุดิบอื่นๆ
]

📊 Summary:
- FG Count: 1
- BOM Count: 9
- Total Count: 10
```

### ผลลัพธ์ที่คาดหวัง
- ✅ ดึงข้อมูล FG จากตาราง `fg` ได้ถูกต้อง
- ✅ ดึงข้อมูล BOM จากตาราง `fg_bom` ได้ถูกต้อง
- ✅ ข้อมูล material_id เป็น ID จริงไม่ใช่ 0
- ✅ ข้อมูลหน่วยเป็นหน่วยจริงไม่ใช่ 'ชิ้น' คงที่
- ⚠️ ราคาจะดึงจาก database `default_itemvalue` แยกต่างหาก

## 🔍 ไฟล์ที่แก้ไข

1. **backend/routes/routes/materials.js**
   - แก้ไข BOM query ในฟังก์ชัน `GET /api/materials/bom/job/:jobCode`
   - บรรทัด 214-230

2. **test_bom_query.js** (ใหม่)
   - ไฟล์ทดสอบ BOM query

## ⚠️ ข้อควรระวัง

1. **Foreign Key Constraint**: ตรวจสอบว่า `fg.FG_Code = wp.job_code` มีข้อมูลตรงกัน
2. **Data Integrity**: ตรวจสอบว่าตาราง `fg` มีข้อมูลครบถ้วน
3. **Performance**: JOIN ระหว่าง `fg` และ `work_plans` อาจช้าถ้าข้อมูลเยอะ

## 🎯 ผลลัพธ์ที่คาดหวัง

- หน้า Inventory จะแสดงข้อมูล FG ที่ถูกต้อง
- ราคาและหน่วยจะแสดงข้อมูลจริงจากฐานข้อมูล
- material_id จะเป็น ID จริงสำหรับการอ้างอิง
- ระบบจะทำงานได้ถูกต้องมากขึ้น
