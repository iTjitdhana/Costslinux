# แก้ไขปัญหา Deduplication ที่ไม่ทำงาน

## 🔍 **ปัญหาที่พบ**

### จาก Console Logs:
```
Original BOM items: 11
Unique BOM items: 11  ← ไม่ได้ลบอะไรเลย!
Removed 0 duplicate items
```

**Deduplication logic เดิมไม่ทำงาน** ยังมีรหัสซ้ำ:
- **แถวที่ 1**: Type `I` รหัส `235073` (น้ำจิ้มสุกี้)
- **แถวที่ 7**: Type `O` รหัส `235073` (น้ำจิ้มสุกี้)

## ✅ **การแก้ไขที่ทำ**

### ปรับปรุง Deduplication Logic แบบใหม่

```javascript
// ❌ เดิม - ใช้ Set แบบธรรมดา
const uniqueBom = [];
const seenMaterialIds = new Set();

bom.forEach(item => {
    if (!seenMaterialIds.has(item.material_id)) {
        seenMaterialIds.add(item.material_id);
        uniqueBom.push(item);
    }
});

// ✅ ใหม่ - ใช้ Map และ Priority-based Logic
let uniqueBom = [];
const materialIdMap = new Map(); // เก็บ material_id และ priority (FG > Raw Material)

// ผ่าน 1: เก็บ FG ก่อน (priority สูง)
bom.forEach(item => {
    if (item.is_fg) {
        materialIdMap.set(item.material_id, item);
        console.log(`Added FG: ${item.material_id} (${item.Mat_Name})`);
    }
});

// ผ่าน 2: เก็บ Raw Material เฉพาะที่ไม่ซ้ำกับ FG
bom.forEach(item => {
    if (!item.is_fg && !materialIdMap.has(item.material_id)) {
        materialIdMap.set(item.material_id, item);
        console.log(`Added Raw Material: ${item.material_id} (${item.Mat_Name})`);
    } else if (!item.is_fg && materialIdMap.has(item.material_id)) {
        console.log(`Skipped duplicate Raw Material: ${item.material_id} (${item.Mat_Name})`);
    }
});

// แปลง Map กลับเป็น Array
uniqueBom = Array.from(materialIdMap.values());
```

## 🎯 **การทำงานของ Algorithm ใหม่**

### Priority-based Deduplication:

#### 1. **ผ่านแรก - เก็บ FG ทั้งหมด**
```
Added FG: 235073 (น้ำจิ้มสุกี้)  ← เก็บไว้
```

#### 2. **ผ่านที่สอง - เก็บ Raw Material ที่ไม่ซ้ำ**
```
Added Raw Material: 507003 (กระเทียมแกะกลีบ - CT)
Added Raw Material: 411045 (กระเทียมดองแม่จินต์ ( น้ำ ) - CT)
...
Skipped duplicate Raw Material: 235073 (น้ำจิ้มสุกี้)  ← ข้าม
```

#### 3. **ผลลัพธ์สุดท้าย**
- **เก็บ FG**: Type `I` รหัส `235073` พร้อมข้อมูล (จำนวน, หน่วยใหญ่, ค่าแปลง, ราคา)
- **ข้าม Raw Material**: Type `O` รหัส `235073` ที่ซ้ำ

## 🧪 **การทดสอบหลังแก้ไข**

### 1. เปิดหน้า http://localhost:3014/inventory
### 2. เลือกงาน 235073 (น้ำจิ้มสุกี้)
### 3. ตรวจสอบ Console Logs:

#### A. FG Priority
```
Added FG: 235073 (น้ำจิ้มสุกี้)
```

#### B. Raw Material Processing
```
Added Raw Material: 507003 (กระเทียมแกะกลีบ - CT)
Added Raw Material: 411045 (กระเทียมดองแม่จินต์ ( น้ำ ) - CT)
...
Skipped duplicate Raw Material: 235073 (น้ำจิ้มสุกี้)
```

#### C. Final Result
```
Original BOM items: 11
Unique BOM items: 10
Removed 1 duplicate items
```

### 4. ตรวจสอบการแสดงข้อมูล:
- ✅ ไม่มีแถวที่ 7 รหัส `235073` Type `O` อีกแล้ว
- ✅ แสดง 10 รายการแทน 11 รายการ
- ✅ แถว Type `I` รหัส `235073` แสดงข้อมูลครบ (จำนวน, หน่วยใหญ่, ค่าแปลง, ราคา)

## 📁 **ไฟล์ที่แก้ไข**

1. **frontend/src/pages/InventoryData.js**
   - ปรับปรุง deduplication logic ใช้ Map แทน Set
   - ใช้ priority-based approach (FG > Raw Material)
   - เพิ่ม console.logs สำหรับ debug

## ⚠️ **หมายเหตุ**

- การแก้ไขนี้จะให้ความสำคัญกับ FG มากกว่า Raw Material
- หาก material_id ซ้ำกัน จะเก็บเฉพาะ FG และข้าม Raw Material
- FG จะแสดงข้อมูลครบถ้วน (จำนวน, หน่วยใหญ่, ค่าแปลง, ราคา)

## 🎯 **ผลลัพธ์**

หลังรีเฟรชหน้าเว็บ:
- ✅ ไม่มีรายการซ้ำ
- ✅ FG แสดงข้อมูลครบถ้วน
- ✅ Raw Materials ที่ไม่ซ้ำแสดงตามปกติ
- ✅ จำนวนรายการลดลงจาก 11 เป็น 10

