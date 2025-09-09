# แก้ไขปัญหา Parameter ผิดใน loadBOMByJobCode

## 🔍 **ปัญหาที่พบ**

### เมื่อเลือกงานแล้ว ขึ้นแจ้งเตือน "เลือกงานก่อน"

**สาเหตุ**: `loadBOMByJobCode` ถูกเรียกด้วย parameter ผิด

## ✅ **การตรวจสอบปัญหา**

### 1. ตรวจสอบการเรียก loadBOMByJobCode
```javascript
// ❌ เดิม - เรียกด้วย selectedWorkplanObj?.id
await loadBOMByJobCode(selectedWorkplanObj?.id || '');

// ✅ ใหม่ - เรียกด้วย jobCode
await loadBOMByJobCode(jobCode);
```

### 2. ปัญหาที่เกิดขึ้น
- **selectedWorkplanObj?.id** อาจเป็น `undefined` หรือ `null`
- **jobCode** เป็นค่าที่ถูกต้องจาก form (เช่น "235073")
- เมื่อส่ง `undefined` หรือ `null` ไปยัง `loadBOMByJobCode` → แสดงข้อความ "เลือกงานก่อน"

## ✅ **การแก้ไขที่ทำ**

### แก้ไข 2 จุดใน loadSavedData function

#### จุดที่ 1: เมื่อไม่มีข้อมูลที่บันทึก
```javascript
// ❌ เดิม
const jobCode = watch('job_code');
if (jobCode) {
    await loadBOMByJobCode(selectedWorkplanObj?.id || ''); // ใช้ selectedWorkplanObj?.id ถ้ามี
}

// ✅ ใหม่
const jobCode = watch('job_code');
if (jobCode) {
    await loadBOMByJobCode(jobCode); // ใช้ jobCode แทน selectedWorkplanObj?.id
}
```

#### จุดที่ 2: เมื่อโหลดข้อมูลที่บันทึกไม่สำเร็จ
```javascript
// ❌ เดิม
const jobCode = watch('job_code');
if (jobCode) {
    await loadBOMByJobCode(selectedWorkplanObj?.id || ''); // ใช้ selectedWorkplanObj?.id ถ้ามี
}

// ✅ ใหม่
const jobCode = watch('job_code');
if (jobCode) {
    await loadBOMByJobCode(jobCode); // ใช้ jobCode แทน selectedWorkplanObj?.id
}
```

## 🎯 **ผลลัพธ์หลังแก้ไข**

### ก่อนแก้ไข:
1. เลือกงาน → `loadBOMByJobCode(undefined)` → แสดง "เลือกงานก่อน"
2. ไม่มีการโหลด BOM
3. ไม่มีการโหลดราคา

### หลังแก้ไข:
1. เลือกงาน → `loadBOMByJobCode("235073")` → โหลด BOM สำเร็จ
2. BOM ถูกโหลด → `fields` มีข้อมูล
3. ราคาถูกโหลด → แสดงราคาในหน้า

## 📁 **ไฟล์ที่แก้ไข**

1. **frontend/src/pages/InventoryData.js**
   - แก้ไข parameter ใน loadSavedData function
   - เปลี่ยนจาก `selectedWorkplanObj?.id` เป็น `jobCode`

## 🧪 **การทดสอบ**

### 1. เปิดหน้า http://localhost:3014/inventory
### 2. เลือกงาน 235073 (น้ำจิ้มสุกี้)
### 3. ตรวจสอบ Console Logs:
```
loadBOMByJobCode called with jobCode: 235073
BOM data before replace: [...]
BOM data replaced, fields should update
useEffect triggered, fields: [...]
useEffect materialIds: [235073, 411022, 413012, ...]
Loading prices for material_ids: [235073, 411022, 413012, ...]
```

### 4. ตรวจสอบการแสดงข้อมูล:
- ✅ ไม่แสดงข้อความ "เลือกงานก่อน"
- ✅ BOM ถูกโหลด
- ✅ ราคาแสดงถูกต้อง

## ⚠️ **หมายเหตุ**

- การแก้ไขนี้จะทำให้ `loadBOMByJobCode` ถูกเรียกด้วย parameter ที่ถูกต้อง
- หลังจากแก้ไขแล้ว ราคาควรจะแสดงได้ปกติ
- Console logs จะช่วยยืนยันว่าการโหลด BOM และราคาทำงานถูกต้อง
