# แก้ไขปัญหา Material ID ซ้ำกัน

> [ARCHIVED] Historical reference. Not required for handover. See `docs/README.md`.

## 🔍 **ปัญหาที่พบ**

### จากภาพที่แสดง มีรหัส `235073` ซ้ำกัน:
- **แถวที่ 1**: Type `I` (FG) - รหัส `235073` น้ำจิ้มสุกี้
- **แถวที่ 7**: Type `O` (Raw Material) - รหัส `235073` น้ำจิ้มสุกี้

## ✅ **การวิเคราะห์ปัญหา**

### สาเหตุของปัญหา:
1. **API ส่งคืน 11 records**: 1 FG + 10 Raw Materials
2. **FG record**: `{"Raw_Code":"235073","is_fg":"1"}` - สินค้าสำเร็จรูป
3. **Raw Material records**: มาจาก `fg_bom` table (10 records)
4. **Frontend ไม่กรองรายการซ้ำ**: แสดงทั้ง FG และ Raw Material ที่มี material_id เดียวกัน

### การตรวจสอบ Database:
```sql
-- fg_bom table มี 10 records
SELECT Raw_Code, FG_Code FROM fg_bom WHERE FG_Code = '235073'
-- ผลลัพธ์: ไม่มี Raw_Code ที่ซ้ำกับ FG_Code

-- แต่ API รวม FG record เข้าไป → 11 records
-- Frontend แสดงทั้งหมด → เกิดการซ้ำ
```

## ✅ **การแก้ไขที่ทำ**

### 1. แก้ไขที่ Backend (ไม่มีผล)
```sql
-- ❌ พยายามแก้ไขที่ Backend แต่ไม่มีผล
WHERE fb.FG_Code = ? AND fb.Raw_Code != fb.FG_Code
```

### 2. แก้ไขที่ Frontend (วิธีที่ใช้)
```javascript
// เพิ่มการกรองรายการซ้ำใน frontend
const uniqueBom = [];
const seenMaterialIds = new Set();

bom.forEach(item => {
    if (!seenMaterialIds.has(item.material_id)) {
        seenMaterialIds.add(item.material_id);
        uniqueBom.push(item);
    } else {
        console.log(`Duplicate material_id found: ${item.material_id} (${item.Mat_Name})`);
    }
});

console.log(`Removed ${bom.length - uniqueBom.length} duplicate items`);
replace(uniqueBom);
```

## 🧪 **การทดสอบหลังแก้ไข**

### 1. เปิดหน้า http://localhost:3014/inventory
### 2. เลือกงาน 235073 (น้ำจิ้มสุกี้)
### 3. ตรวจสอบ Console Logs:

```
BOM item: น้ำจิ้มสุกี้, material_id: 235073, type: number
BOM item: กระเทียมแกะกลีบ - CT, material_id: 507003, type: number
...
Duplicate material_id found: 235073 (น้ำจิ้มสุกี้)
Removed 1 duplicate items
BOM data before replace: [10 unique items]
```

### 4. ตรวจสอบการแสดงข้อมูล:
- ✅ ไม่มีรหัสซ้ำ
- ✅ แสดง 10 รายการ (ไม่ใช่ 11)
- ✅ FG แสดงเป็น Type `I` 
- ✅ Raw Materials แสดงเป็น Type `O`

## 🎯 **ผลลัพธ์หลังแก้ไข**

### ก่อนแก้ไข:
```
1. I  235073  น้ำจิ้มสุกี้
2. O  507003  กระเทียมแกะกลีบ - CT
...
7. O  235073  น้ำจิ้มสุกี้  ← ซ้ำ
```

### หลังแก้ไข:
```
1. I  235073  น้ำจิ้มสุกี้
2. O  507003  กระเทียมแกะกลีบ - CT
...
10. O  207010  พริกขี้หนูแดง
```

## 📁 **ไฟล์ที่แก้ไข**

1. **frontend/src/pages/InventoryData.js**
   - เพิ่มการกรองรายการซ้ำใน `loadBOMByJobCode`
   - ใช้ `Set` เพื่อติดตาม material_id ที่เห็นแล้ว
   - เพิ่ม console.logs สำหรับ debug

## ⚠️ **หมายเหตุ**

- การแก้ไขนี้จะกรองรายการซ้ำที่มี `material_id` เดียวกัน
- รายการแรกที่พบจะถูกเก็บไว้ (FG จะมาก่อน Raw Material)
- Toast message จะแสดงจำนวนที่ถูกต้องหลังกรอง

## 🔧 **การทำงานของ Algorithm**

### Deduplication Logic:
1. **สร้าง Set เปล่า**: `seenMaterialIds = new Set()`
2. **วน loop ผ่าน BOM items**: 
   - หาก `material_id` ยังไม่เห็น → เพิ่มเข้า `uniqueBom`
   - หาก `material_id` เห็นแล้ว → ข้าม (log duplicate)
3. **ใช้ uniqueBom**: แทน original BOM array

### ข้อดี:
- ✅ กรองรายการซ้ำได้อย่างมีประสิทธิภาพ
- ✅ เก็บรายการแรกที่พบ (FG priority)
- ✅ ไม่กระทบ Backend logic
- ✅ Debug ได้ง่ายด้วย console.logs
