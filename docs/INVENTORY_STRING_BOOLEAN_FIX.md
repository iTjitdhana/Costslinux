# แก้ไขปัญหา String vs Boolean ในหน้า Inventory

## 🔍 **ปัญหาที่พบ**

### 1. Type แสดงเป็น I ทั้งหมด
**สาเหตุ**: ข้อมูล `is_fg` จาก API เป็น string `"0"` และ `"1"` ไม่ใช่ boolean

### 2. ลำดับซ้ำ
**สาเหตุ**: แถว FG แรกแสดงลำดับ 1 และแถวแรกของ sortedFields ก็แสดงลำดับ 1

### 3. ราคาไม่โหลด
**สาเหตุ**: การ map ข้อมูล BOM ใช้ `item.is_fg` เป็น boolean แต่ข้อมูลจริงเป็น string

## ✅ **การแก้ไขที่ทำ**

### 1. แก้ไข Type Display
```javascript
// ❌ เดิม
{field.is_fg ? 'I' : 'O'}

// ✅ ใหม่
{field.is_fg === '1' || field.is_fg === 1 ? 'I' : 'O'}
```

### 2. แก้ไขลำดับ
```javascript
// ❌ เดิม
{index + 1}

// ✅ ใหม่
{(workplanId || jobRowCode) ? index + 2 : index + 1}
```

### 3. แก้ไข BOM Data Mapping
```javascript
// ❌ เดิม
const bom = bomData.map((item) => ({
    material_id: item.is_fg ? item.Mat_Id : item.material_id,
    is_fg: item.is_fg || false,
    // ...
}));

// ✅ ใหม่
const bom = bomData.map((item) => ({
    material_id: (item.is_fg === '1' || item.is_fg === 1) ? item.Mat_Id : item.material_id,
    is_fg: item.is_fg === '1' || item.is_fg === 1,
    // ...
}));
```

### 4. แก้ไขการ Filter ข้อมูล
```javascript
// ❌ เดิม
const fgMaterials = allMaterials.filter(m => m.is_fg);
const rawMaterials = allMaterials.filter(m => !m.is_fg);

// ✅ ใหม่
const fgMaterials = allMaterials.filter(m => m.is_fg === '1' || m.is_fg === 1);
const rawMaterials = allMaterials.filter(m => !(m.is_fg === '1' || m.is_fg === 1));
```

### 5. แก้ไขการแสดงสีแถว
```javascript
// ❌ เดิม
className={field.is_fg ? 'bg-blue-50' : field.is_custom ? 'bg-yellow-50' : ''}

// ✅ ใหม่
className={(field.is_fg === '1' || field.is_fg === 1) ? 'bg-blue-50' : field.is_custom ? 'bg-yellow-50' : ''}
```

### 6. แก้ไข Preview Modal
```javascript
// ❌ เดิม
{material.is_fg ? 'I' : 'M'}
{material.is_fg ? 'bg-blue-50' : ...}
{material.is_fg ? (<span>FG</span>) : ...}

// ✅ ใหม่
{material.is_fg === '1' || material.is_fg === 1 ? 'I' : 'O'}
{(material.is_fg === '1' || material.is_fg === 1) ? 'bg-blue-50' : ...}
{(material.is_fg === '1' || material.is_fg === 1) ? (<span>FG</span>) : ...}
```

## 📊 **ข้อมูลจาก API**

### BOM Data Structure
```json
{
  "success": true,
  "data": [
    {
      "Raw_Code": "235191",
      "Raw_Qty": "1",
      "FG_Code": "235191",
      "material_id": 63,
      "Mat_Name": "ซอสหมี่กะเฉด",
      "Mat_Unit": "กก.",
      "price": "0",
      "is_fg": "1"  // ← String "1" ไม่ใช่ boolean true
    },
    {
      "Raw_Code": "413001",
      "Raw_Qty": 0.05000000074505806,
      "FG_Code": "235191",
      "material_id": 7,
      "Mat_Name": "ชูรส 20 กก.(ถุงละ 1 กก) - CT",
      "Mat_Unit": "กก.",
      "price": "0.00",
      "is_fg": "0"  // ← String "0" ไม่ใช่ boolean false
    }
  ]
}
```

## 🎯 **ผลลัพธ์หลังแก้ไข**

### ✅ **ที่แก้ไขได้**
- Type จะแสดงเป็น `O` สำหรับวัตถุดิบ, `I` สำหรับ FG
- ลำดับจะไม่ซ้ำ (1, 2, 3, 4, 5, 6)
- การแยกข้อมูล FG และ Raw Materials จะทำงานถูกต้อง
- การแสดงสีแถวจะถูกต้อง
- Preview Modal จะแสดงข้อมูลถูกต้อง

### ⚠️ **ที่ยังแก้ไม่ได้**
- ราคา/หน่วย(ราคากลาง) ยังแสดงเป็น `-` เพราะ material_id ใน BOM ไม่มีราคาใน database `default_itemvalue`

## 📁 **ไฟล์ที่แก้ไข**

1. **frontend/src/pages/InventoryData.js**
   - แก้ไข Type display logic
   - แก้ไขลำดับ calculation
   - แก้ไข BOM data mapping
   - แก้ไขการ filter ข้อมูล
   - แก้ไขการแสดงสีแถว
   - แก้ไข Preview Modal

## 🧪 **การทดสอบ**

1. เปิดหน้า http://localhost:3014/inventory
2. เลือกงานที่มี BOM
3. ตรวจสอบว่า:
   - Type แสดงเป็น `O` สำหรับวัตถุดิบ, `I` สำหรับ FG
   - ลำดับไม่ซ้ำ (1, 2, 3, 4, 5, 6)
   - แถว FG มีพื้นหลังสีฟ้า
   - แถววัตถุดิบมีพื้นหลังสีขาว
   - Preview Modal แสดงข้อมูลถูกต้อง

## ⚠️ **หมายเหตุ**

- ปัญหาหลักคือ JavaScript treats `"0"` as truthy value
- ต้องใช้ explicit comparison `=== '1'` หรือ `=== 1`
- การแก้ไขนี้จะมีผลกับทุก role ที่ใช้หน้า Inventory
