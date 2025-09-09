# เพิ่ม Console Logs สำหรับ Debug ปัญหาราคาไม่แสดง

## 🔍 **ปัญหาที่พบ**

### จากภาพที่แสดง ใน Console มี log:
```
useEffect triggered, fields: InventoryData.js:97
useEffect materialIds: [] InventoryData.js:98
```

**`materialIds: []` เป็น array ว่าง!** นี่คือสาเหตุที่ราคาไม่แสดง

## ✅ **การแก้ไขที่ทำ**

### เพิ่ม Console Logs สำหรับ Debug

#### 1. ใน useEffect ที่โหลดราคา
```javascript
useEffect(() => {
    const materialIds = (fields || [])
        .map(f => f.material_id)
        .filter(id => id && Number.isFinite(id));
    
    console.log('useEffect triggered, fields:', fields);
    console.log('useEffect fields length:', fields?.length);
    console.log('useEffect fields details:', fields?.map(f => ({ id: f.id, material_id: f.material_id, Mat_Name: f.Mat_Name })));
    console.log('useEffect materialIds:', materialIds);
    
    if (materialIds.length > 0) {
        loadLatestPricesForMaterials(materialIds);
    }
}, [fields.map(f => f.material_id).join(',')]);
```

#### 2. ใน loadBOMByJobCode
```javascript
const loadBOMByJobCode = async (jobCode) => {
    try {
        console.log('loadBOMByJobCode called with jobCode:', jobCode);
        // ... existing code ...
        
        console.log('BOM data before replace:', bom);
        replace(bom);
        console.log('BOM data replaced, fields should update');
        // ... existing code ...
    } catch (error) {
        console.error('Error loading BOM:', error);
    }
};
```

#### 3. ใน loadLatestPricesForMaterials
```javascript
const loadLatestPricesForMaterials = React.useCallback(async (materialIds) => {
    try {
        console.log('Loading prices for material_ids:', ids);
        const res = await pricesAPI.getLatestBatch(ids);
        console.log('API response:', res);
        const rows = res.data || [];
        console.log('Price rows:', rows);
        const map = {};
        for (const row of rows) {
            map[row.material_id] = row;
        }
        console.log('Loaded prices map:', map);
        setLatestPrices(map);
    } catch (e) {
        console.error('Error loading latest prices:', e);
    }
}, []);
```

#### 4. ใน price display logic
```javascript
{(() => {
    const p = latestPrices[field.material_id];
    console.log(`Price for material_id ${field.material_id}:`, p, 'latestPrices:', latestPrices);
    if (!p) return '-';
    
    // ... existing code ...
})()}
```

## 🧪 **การทดสอบ**

### 1. เปิดหน้า http://localhost:3014/inventory
### 2. เลือกงาน 235073 (น้ำจิ้มสุกี้)
### 3. ตรวจสอบ Console Logs ตามลำดับ:

#### A. การโหลด BOM
```
loadBOMByJobCode called with jobCode: 235073
BOM data before replace: [...]
BOM data replaced, fields should update
```

#### B. การอัปเดต fields
```
useEffect triggered, fields: [...]
useEffect fields length: 11
useEffect fields details: [...]
useEffect materialIds: [235073, 411022, 413012, ...]
```

#### C. การโหลดราคา
```
Loading prices for material_ids: [235073, 411022, 413012, ...]
API response: {...}
Price rows: [...]
Loaded prices map: {...}
```

#### D. การแสดงราคา
```
Price for material_id 235073: {...} latestPrices: {...}
Price for material_id 411022: {...} latestPrices: {...}
```

## 🎯 **ผลลัพธ์ที่คาดหวัง**

### หากทุกอย่างทำงานถูกต้อง:
1. **BOM ถูกโหลด** → `fields` มีข้อมูล
2. **useEffect ถูกเรียก** → `materialIds` ไม่เป็น array ว่าง
3. **API ถูกเรียก** → ราคาถูกโหลด
4. **ราคาแสดง** → ไม่แสดง `-` หรือ `0`

### หากยังมีปัญหา:
1. **BOM ไม่ถูกโหลด** → ตรวจสอบ `loadBOMByJobCode called with jobCode:`
2. **fields ว่าง** → ตรวจสอบ `useEffect fields length:`
3. **materialIds ว่าง** → ตรวจสอบ `useEffect materialIds:`
4. **API ไม่ถูกเรียก** → ตรวจสอบ `Loading prices for material_ids:`

## 📁 **ไฟล์ที่แก้ไข**

1. **frontend/src/pages/InventoryData.js**
   - เพิ่ม console.logs ใน useEffect
   - เพิ่ม console.logs ใน loadBOMByJobCode
   - เพิ่ม console.logs ใน loadLatestPricesForMaterials
   - เพิ่ม console.logs ใน price display logic

## ⚠️ **หมายเหตุ**

- Console logs จะช่วยระบุจุดที่เกิดปัญหา
- หาก `materialIds: []` ยังคงเป็น array ว่าง แสดงว่า `fields` ไม่มีข้อมูล
- หาก `fields` ว่าง แสดงว่า `loadBOMByJobCode` ไม่ถูกเรียกหรือ `replace` ไม่ทำงาน
- หาก API ไม่ถูกเรียก แสดงว่า `materialIds` ว่าง

## 🔧 **การแก้ไขเพิ่มเติม**

### หากยังมีปัญหา ให้ตรวจสอบ:
1. **การเรียก loadBOMByJobCode** - ตรวจสอบว่า function ถูกเรียกหรือไม่
2. **การทำงานของ replace** - ตรวจสอบว่า fields อัปเดตหรือไม่
3. **การทำงานของ useEffect** - ตรวจสอบว่า dependency ถูกต้องหรือไม่
4. **การทำงานของ API** - ตรวจสอบว่า API ถูกเรียกหรือไม่
