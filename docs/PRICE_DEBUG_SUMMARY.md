# สรุปการ Debug ปัญหาราคาไม่แสดง

## 🔍 **ปัญหาที่พบ**

### ราคา/หน่วย(ราคากลาง) แสดงเป็น `0` หรือ `-` ทั้งที่ API ส่งคืนราคาได้

## ✅ **การตรวจสอบที่ทำ**

### 1. ตรวจสอบ API Backend
- ✅ **API `/api/prices/latest-batch` ทำงานได้ปกติ**
- ✅ **Database มีราคาสำหรับ material_id ทั้งหมด**
- ✅ **API ส่งคืนราคาได้ถูกต้อง**

### 2. ตรวจสอบข้อมูล BOM
```json
{
  "Raw_Code": "411022",
  "material_id": 17,  // ← ใช้ใน BOM mapping
  "Mat_Name": "น้ำมันงา ตรามังกรคู่ 2,840 กรัม - CT"
}
```

### 3. ตรวจสอบข้อมูลราคา
```json
{
  "material_id": 411022,  // ← Raw_Code เดียวกัน
  "material_name": "น้ำมันงา ตรามังกรคู่ 2,840 กรัม - CT",
  "price_per_unit": "232.140000"
}
```

### 4. การแก้ไข Material ID Mapping
```javascript
// ✅ แก้ไขแล้ว - ใช้ Raw_Code สำหรับ Raw Materials
material_id: (item.is_fg === '1' || item.is_fg === 1) ? item.Mat_Id : item.Raw_Code
```

## 🧪 **การทดสอบ API**

### BOM Data (job 235073)
- **235073** (น้ำจิ้มสุกี้): 75.23 บาท/กก.
- **411022** (น้ำมันงา): 232.14 บาท/กก.
- **413012** (น้ำตาล): 25.24 บาท/กก.
- **416004** (ซอสพริก): 47.50 บาท/กก.
- **411019** (น้ำปลา): 42.85 บาท/กก.
- **411044** (กระเทียมดอง): 74.22 บาท/กก.
- **411045** (กระเทียมดอง): 92.78 บาท/กก.
- **230015** (งาขาว): 120.00 บาท/กก.
- **507003** (กระเทียม): 111.00 บาท/กก.
- **507074** (รากผักชี): 190.00 บาท/กก.
- **207010** (พริกขี้หนู): 86.00 บาท/กก.

## 🔧 **การแก้ไขที่ทำ**

### 1. แก้ไข Material ID Mapping
```javascript
// ❌ เดิม
material_id: (item.is_fg === '1' || item.is_fg === 1) ? item.Mat_Id : item.material_id

// ✅ ใหม่
material_id: (item.is_fg === '1' || item.is_fg === 1) ? item.Mat_Id : item.Raw_Code
```

### 2. เพิ่ม Console Logs สำหรับ Debug
```javascript
// ใน loadLatestPricesForMaterials
console.log('Loading prices for material_ids:', ids);
console.log('API response:', res);
console.log('Price rows:', rows);
console.log('Loaded prices map:', map);

// ใน useEffect
console.log('useEffect triggered, fields:', fields);
console.log('useEffect materialIds:', materialIds);

// ใน price display
console.log(`Price for material_id ${field.material_id}:`, p, 'latestPrices:', latestPrices);
```

## 🎯 **ผลลัพธ์ที่คาดหวัง**

### หลังแก้ไขแล้ว หน้า Inventory ควรแสดง:
- **น้ำจิ้มสุกี้**: ราคา 75.23 บาท/กก.
- **น้ำมันงา**: ราคา 232.14 บาท/กก.
- **น้ำตาล**: ราคา 25.24 บาท/กก.
- **ซอสพริก**: ราคา 47.50 บาท/กก.
- **น้ำปลา**: ราคา 42.85 บาท/กก.
- **กระเทียมดอง**: ราคา 74.22 บาท/กก.
- **กระเทียมดอง**: ราคา 92.78 บาท/กก.
- **งาขาว**: ราคา 120.00 บาท/กก.
- **กระเทียม**: ราคา 111.00 บาท/กก.
- **รากผักชี**: ราคา 190.00 บาท/กก.
- **พริกขี้หนู**: ราคา 86.00 บาท/กก.

## 📁 **ไฟล์ที่แก้ไข**

1. **frontend/src/pages/InventoryData.js**
   - แก้ไข material_id mapping ในฟังก์ชัน `loadBOMByJobCode`
   - เพิ่ม console.logs สำหรับ debug

## 🧪 **การทดสอบ**

### 1. เปิดหน้า http://localhost:3014/inventory
### 2. เลือกงาน 235073 (น้ำจิ้มสุกี้)
### 3. ตรวจสอบ Console Logs:
   - `useEffect triggered, fields: [...]`
   - `useEffect materialIds: [...]`
   - `Loading prices for material_ids: [...]`
   - `API response: {...}`
   - `Price rows: [...]`
   - `Loaded prices map: {...}`
   - `Price for material_id XXX: {...}`

### 4. ตรวจสอบการแสดงราคา:
   - ราคา/หน่วย(ราคากลาง) ควรแสดงราคาที่ถูกต้อง
   - ไม่ควรแสดง `-` หรือ `0`

## ⚠️ **หมายเหตุ**

- การแก้ไขนี้จะทำให้ราคาแสดงได้สำหรับ Raw Materials ที่มี Raw_Code ตรงกับ material_id ใน database
- Console logs จะช่วย debug หากยังมีปัญหา
- หากยังไม่แสดงราคา ให้ตรวจสอบ console logs เพื่อดูว่า API ถูกเรียกหรือไม่
