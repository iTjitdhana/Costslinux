# แก้ไขปัญหา Material ID Mapping

> [ARCHIVED] Historical reference. Not required for handover. See `docs/README.md`.

## 🔍 **ปัญหาที่พบ**

### จากภาพที่แสดง:
- **แถวที่ 7** (รหัส 235073) แสดงเป็น `-` ในคอลัม "หน่วยใหญ่" และ "ค่าแปลง"
- **การกรองรายการซ้ำไม่ทำงาน** ยังมีแถวที่ 7 ซ้ำกับแถวที่ 1

## ✅ **การวิเคราะห์ปัญหา**

### สาเหตุของปัญหา:

#### 1. API Data Structure
```json
// FG Record
{"Raw_Code":"235073","material_id":50,"is_fg":"1"}  // ไม่มี Mat_Id field

// Raw Material Record  
{"Raw_Code":"235073","material_id":XX,"is_fg":"0"}  // มี Raw_Code
```

#### 2. Frontend Mapping Logic (เดิม)
```javascript
// ❌ ปัญหา: FG ใช้ item.Mat_Id (undefined) → NaN
const materialId = Number((item.is_fg === '1' || item.is_fg === 1) ? item.Mat_Id : item.Raw_Code);
```

#### 3. ผลลัพธ์ที่เกิดขึ้น:
- **FG**: `material_id = Number(undefined) = NaN`
- **Raw Material**: `material_id = Number("235073") = 235073`
- **Deduplication ไม่ทำงาน**: เพราะ `NaN !== 235073`

## ✅ **การแก้ไขที่ทำ**

### แก้ไข Material ID Mapping

```javascript
// ❌ เดิม - ใช้ Mat_Id สำหรับ FG (ไม่มีใน API)
const materialId = Number((item.is_fg === '1' || item.is_fg === 1) ? item.Mat_Id : item.Raw_Code);

// ✅ ใหม่ - ใช้ Raw_Code สำหรับทั้งหมด
const materialId = Number(item.Raw_Code);
```

## 🎯 **ผลลัพธ์หลังแก้ไข**

### ก่อนแก้ไข:
```
FG: material_id = NaN (จาก undefined Mat_Id)
Raw Material: material_id = 235073 (จาก Raw_Code)
→ Deduplication ไม่ทำงาน: NaN !== 235073
→ แสดงทั้งสองแถว
```

### หลังแก้ไข:
```
FG: material_id = 235073 (จาก Raw_Code)
Raw Material: material_id = 235073 (จาก Raw_Code) 
→ Deduplication ทำงาน: 235073 === 235073
→ แสดงแถวเดียว (FG มาก่อน)
```

## 🧪 **การทดสอบหลังแก้ไข**

### 1. เปิดหน้า http://localhost:3014/inventory
### 2. เลือกงาน 235073 (น้ำจิ้มสุกี้)
### 3. ตรวจสอบ Console Logs:

```
BOM item: น้ำจิ้มสุกี้, is_fg: 1, Raw_Code: 235073, material_id: 235073, type: number
BOM item: กระเทียมแกะกลีบ, is_fg: 0, Raw_Code: 507003, material_id: 507003, type: number
...
BOM item: น้ำจิ้มสุกี้, is_fg: 0, Raw_Code: 235073, material_id: 235073, type: number  ← ซ้ำ
Duplicate material_id found: 235073 (น้ำจิ้มสุกี้)
Removed 1 duplicate items
```

### 4. ตรวจสอบการแสดงข้อมูล:
- ✅ ไม่มีแถวที่ 7 (รหัส 235073) อีกแล้ว
- ✅ แสดง 10 รายการแทน 11 รายการ
- ✅ คอลัม "หน่วยใหญ่" และ "ค่าแปลง" แสดงข้อมูลถูกต้อง

## 📁 **ไฟล์ที่แก้ไข**

1. **frontend/src/pages/InventoryData.js**
   - แก้ไข material_id mapping ให้ใช้ Raw_Code สำหรับทั้ง FG และ Raw Material
   - ทำให้ deduplication ทำงานได้ถูกต้อง

## ⚠️ **หมายเหตุ**

- การแก้ไขนี้จะทำให้ทั้ง FG และ Raw Material ใช้ Raw_Code เป็น material_id
- Deduplication จะทำงานได้ถูกต้องเพราะ material_id เหมือนกัน
- FG จะถูกเก็บไว้เพราะมาก่อน Raw Material ในลำดับ

## 🎯 **ผลลัพธ์สุดท้าย**

หลังรีเฟรชหน้าเว็บ:
- ✅ ไม่มีรายการซ้ำ
- ✅ แสดง 10 รายการแทน 11 รายการ
- ✅ คอลัม "หน่วยใหญ่" และ "ค่าแปลง" แสดงข้อมูลถูกต้อง
- ✅ Toast message แสดง "โหลดสูตร BOM สำเร็จ (10 รายการ)"
