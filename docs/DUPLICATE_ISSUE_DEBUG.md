# Debug ปัญหารหัสซ้ำยังคงมีอยู่

## 🔍 **ปัญหาที่พบ**

### จากภาพที่แสดง ยังมีรหัสซ้ำ:
- **แถวที่ 1**: Type `I` รหัส `235073` (น้ำจิ้มสุกี้)
- **แถวที่ 7**: Type `O` รหัส `235073` (น้ำจิ้มสุกี้)

**นี่หมายความว่า deduplication logic ไม่ทำงาน**

## ✅ **การแก้ไขที่ทำ**

### เพิ่ม Console Logs สำหรับ Debug

```javascript
// ใน BOM mapping
console.log(`BOM item: ${item.Mat_Name}, Raw_Code: ${item.Raw_Code}, material_id: ${materialId}, is_fg: ${item.is_fg}`);

// ใน deduplication
console.log(`Original BOM items: ${bom.length}`);
console.log(`Unique BOM items: ${uniqueBom.length}`);
console.log(`Removed ${bom.length - uniqueBom.length} duplicate items`);
console.log('Unique BOM data:', uniqueBom.map(item => ({ material_id: item.material_id, Mat_Name: item.Mat_Name, is_fg: item.is_fg })));
```

## 🧪 **การทดสอบเพื่อ Debug**

### 1. เปิดหน้า http://localhost:3014/inventory
### 2. เลือกงาน 235073 (น้ำจิ้มสุกี้)
### 3. ตรวจสอบ Console Logs:

#### A. BOM Item Mapping
```
BOM item: น้ำจิ้มสุกี้, Raw_Code: 235073, material_id: 235073, is_fg: 1
BOM item: กระเทียมแกะกลีบ - CT, Raw_Code: 507003, material_id: 507003, is_fg: 0
...
BOM item: น้ำจิ้มสุกี้, Raw_Code: 235073, material_id: 235073, is_fg: 0  ← ซ้ำ
```

#### B. Deduplication Process
```
Original BOM items: 11
Duplicate material_id found: 235073 (น้ำจิ้มสุกี้)
Unique BOM items: 10
Removed 1 duplicate items
```

#### C. Final Data
```
Unique BOM data: [
    { material_id: 235073, Mat_Name: "น้ำจิ้มสุกี้", is_fg: true },
    { material_id: 507003, Mat_Name: "กระเทียมแกะกลีบ - CT", is_fg: false },
    ...
]
```

## 🎯 **ผลลัพธ์ที่คาดหวัง**

### หาก Deduplication ทำงานถูกต้อง:
1. **Console จะแสดง**: `Duplicate material_id found: 235073`
2. **Console จะแสดง**: `Removed 1 duplicate items`
3. **หน้าเว็บจะแสดง**: 10 รายการ (ไม่ใช่ 11)
4. **ไม่มีแถวที่ 7**: รหัส 235073 Type O

### หาก Deduplication ไม่ทำงาน:
1. **Console จะแสดง**: `Removed 0 duplicate items`
2. **หน้าเว็บจะแสดง**: 11 รายการ
3. **ยังมีแถวที่ 7**: รหัส 235073 Type O

## 🔧 **แนวทางแก้ไขเพิ่มเติม**

### หาก Deduplication ยังไม่ทำงาน:

#### Option 1: แก้ไขที่ Backend
```sql
-- กรอง Raw Material ที่ซ้ำกับ FG ออกจาก SQL query
WHERE fb.FG_Code = ? AND fb.Raw_Code != fb.FG_Code
```

#### Option 2: แก้ไขที่ Frontend (ปรับปรุง logic)
```javascript
// ใช้ composite key แทน material_id เดียว
const compositeKey = `${item.material_id}_${item.is_fg}`;
if (!seenKeys.has(compositeKey)) {
    // เก็บเฉพาะ FG หากมี Raw Material ซ้ำ
    if (item.is_fg || !seenMaterialIds.has(item.material_id)) {
        seenKeys.add(compositeKey);
        seenMaterialIds.add(item.material_id);
        uniqueBom.push(item);
    }
}
```

## 📁 **ไฟล์ที่แก้ไข**

1. **frontend/src/pages/InventoryData.js**
   - เพิ่ม console.logs สำหรับ debug deduplication
   - เพิ่ม console.logs ใน BOM item mapping

## ⚠️ **หมายเหตุ**

- หาก console logs แสดงว่า deduplication ทำงาน แต่หน้าเว็บยังแสดงรายการซ้ำ อาจมีปัญหาอื่น
- หาก console logs แสดงว่า deduplication ไม่ทำงาน ต้องแก้ไข logic
- ตรวจสอบว่า material_id ของ FG และ Raw Material เหมือนกันจริงหรือไม่

## 🧪 **การทดสอบ**

**ลองรีเฟรชหน้าเว็บและดู Console Logs เพื่อดูว่า:**
1. BOM items มี material_id เหมือนกันหรือไม่?
2. Deduplication ทำงานหรือไม่?
3. จำนวน items ก่อนและหลัง deduplication เป็นเท่าไหร่?

**หากยังมีปัญหา จะต้องแก้ไข deduplication logic เพิ่มเติม**

