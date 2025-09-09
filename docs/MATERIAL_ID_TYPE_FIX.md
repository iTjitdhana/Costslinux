# แก้ไขปัญหา Material ID Type Conversion

## 🔍 **ปัญหาที่พบ**

### จาก Console Logs:
```
useEffect triggered, fields: [...]
useEffect fields length: 0
useEffect materialIds: []
```

**`fields` ยังไม่มีข้อมูล** แม้ว่า BOM ถูกโหลดและ `replace(bom)` ถูกเรียกแล้ว

## ✅ **การวิเคราะห์ปัญหา**

### สาเหตุที่เป็นไปได้:

#### 1. Material ID เป็น String แต่ต้องการ Number
```javascript
// ❌ เดิม - material_id เป็น string
material_id: (item.is_fg === '1' || item.is_fg === 1) ? item.Mat_Id : item.Raw_Code

// ✅ ใหม่ - แปลงเป็ number
material_id: Number((item.is_fg === '1' || item.is_fg === 1) ? item.Mat_Id : item.Raw_Code)
```

#### 2. Number.isFinite() Filter ไม่ผ่าน
```javascript
const materialIds = (fields || [])
    .map(f => f.material_id)
    .filter(id => id && Number.isFinite(id)); // ← ต้องเป็น number
```

## ✅ **การแก้ไขที่ทำ**

### 1. แปลง Material ID เป็น Number
```javascript
const bom = bomData.map((item) => {
    const materialId = Number((item.is_fg === '1' || item.is_fg === 1) ? item.Mat_Id : item.Raw_Code);
    console.log(`BOM item: ${item.Mat_Name}, is_fg: ${item.is_fg}, Mat_Id: ${item.Mat_Id}, Raw_Code: ${item.Raw_Code}, material_id: ${materialId}, type: ${typeof materialId}`);
    
    return {
        material_id: materialId, // แปลงเป็ number
        // ... other fields
    };
});
```

### 2. เพิ่ม Console Logs สำหรับ Debug
```javascript
// ใน useEffect
console.log('useEffect fields details:', fields?.map(f => ({ 
    id: f.id, 
    material_id: f.material_id, 
    Mat_Name: f.Mat_Name, 
    type: typeof f.material_id 
})));
console.log('useEffect materialIds types:', materialIds.map(id => ({ 
    id, 
    type: typeof id, 
    isFinite: Number.isFinite(id) 
})));

// ใน BOM mapping
console.log(`BOM item: ${item.Mat_Name}, material_id: ${materialId}, type: ${typeof materialId}`);
```

## 🧪 **การทดสอบหลังแก้ไข**

### 1. เปิดหน้า http://localhost:3014/inventory
### 2. เลือกงาน 235073 (น้ำจิ้มสุกี้)
### 3. ตรวจสอบ Console Logs:

#### A. BOM Item Mapping
```
BOM item: น้ำจิ้มสุกี้, is_fg: 1, Mat_Id: 235073, Raw_Code: 235073, material_id: 235073, type: number
BOM item: กระเทียมแกะกลีบ - CT, is_fg: 0, Mat_Id: undefined, Raw_Code: 507003, material_id: 507003, type: number
```

#### B. Fields Update
```
useEffect fields length: 11
useEffect fields details: [
    { id: ..., material_id: 235073, Mat_Name: "น้ำจิ้มสุกี้", type: "number" },
    { id: ..., material_id: 507003, Mat_Name: "กระเทียมแกะกลีบ - CT", type: "number" }
]
```

#### C. Material IDs Filtering
```
useEffect materialIds: [235073, 507003, 411045, ...]
useEffect materialIds types: [
    { id: 235073, type: "number", isFinite: true },
    { id: 507003, type: "number", isFinite: true }
]
```

#### D. API Call
```
Loading prices for material_ids: [235073, 507003, 411045, ...]
API response: {...}
Loaded prices map: {...}
```

## 🎯 **ผลลัพธ์ที่คาดหวัง**

### หากแก้ไขสำเร็จ:
1. **BOM ถูกโหลด** → `material_id` เป็น number
2. **Fields มีข้อมูล** → `useEffect fields length: 11`
3. **Material IDs ผ่าน filter** → `materialIds` ไม่เป็น array ว่าง
4. **API ถูกเรียก** → ราคาถูกโหลด
5. **ราคาแสดง** → ไม่แสดง `-` หรือ `0`

### หากยังมีปัญหา:
1. **Type ยังไม่ใช่ number** → ตรวจสอบ `type: ${typeof materialId}`
2. **isFinite: false** → ตรวจสอบว่า string สามารถแปลงเป็น number ได้หรือไม่
3. **Fields ยังว่าง** → ตรวจสอบ `replace()` function

## 📁 **ไฟล์ที่แก้ไข**

1. **frontend/src/pages/InventoryData.js**
   - แก้ไข material_id mapping ให้เป็น number
   - เพิ่ม console.logs สำหรับ debug type conversion
   - เพิ่ม console.logs สำหรับ debug filtering

## ⚠️ **หมายเหตุ**

- การแปลง string เป็น number ด้วย `Number()` อาจให้ `NaN` หาก string ไม่สามารถแปลงได้
- `Number.isFinite(NaN)` จะเป็น `false`
- หาก Raw_Code หรือ Mat_Id ไม่ใช่ตัวเลข จะต้องหาวิธีอื่นในการจัดการ

## 🔧 **การแก้ไขเพิ่มเติม**

### หากยังมีปัญหา ให้ลองใช้:
```javascript
// แทนที่ Number() ด้วย parseInt()
material_id: parseInt((item.is_fg === '1' || item.is_fg === 1) ? item.Mat_Id : item.Raw_Code, 10)

// หรือใช้ fallback
material_id: Number((item.is_fg === '1' || item.is_fg === 1) ? item.Mat_Id : item.Raw_Code) || 0
```
