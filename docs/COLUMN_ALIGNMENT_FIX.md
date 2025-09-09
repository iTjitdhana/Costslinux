# แก้ไขปัญหาคอลัมสลับกัน

## 🔍 **ปัญหาที่พบ**

### จากภาพที่แสดง ข้อมูลสลับคอลัมกัน:

**Header**: จำนวนเบิก → หน่วยใหญ่ → ค่าแปลง → หน่วย → ราคา/หน่วย(ราคากลาง)

**Data**: จำนวนเบิก → [input disabled] → หน่วยใหญ่ → ค่าแปลง → หน่วย → ราคา/หน่วย(ราคากลาง)

**ปัญหา**: มี **input disabled** เพิ่มเข้ามา 1 คอลัม ทำให้ข้อมูลเลื่อนไป

## ✅ **การแก้ไขที่ทำ**

### 1. ลบ Input Disabled ที่ไม่จำเป็น

```javascript
// ❌ เดิม - มี input disabled เพิ่มเข้ามา
<td className="px-4 py-3 whitespace-nowrap">
    <input ... placeholder="0" />
</td>
<td className="px-4 py-3 whitespace-nowrap text-center">
    <input type="text" className="input w-16 text-center" placeholder="-" disabled />
</td>
<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
    {/* หน่วยใหญ่ */}
</td>

// ✅ ใหม่ - ลบ input disabled ออก
<td className="px-4 py-3 whitespace-nowrap">
    <input ... placeholder="0" />
</td>
<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
    {/* หน่วยใหญ่ */}
</td>
```

### 2. ลบ Console Logs ที่ไม่จำเป็น

```javascript
// ลบ console.logs ที่ใช้สำหรับ debug
- console.log('loadBOMByJobCode called with jobCode:', jobCode);
- console.log('BOM item: ...'); 
- console.log('useEffect triggered, fields:', fields);
- console.log('Loading prices for material_ids:', ids);
- console.log('Price for material_id ...:', p);
```

## 📊 **โครงสร้างคอลัมที่ถูกต้องหลังแก้ไข**

| ลำดับ | Header | Data |
|-------|--------|------|
| 1 | ลำดับ | index + 1 |
| 2 | TYPE | I/O |
| 3 | รหัสสินค้า | field.Mat_Id |
| 4 | ชื่อสินค้า | field.Mat_Name |
| 5 | จำนวน | field.planned_qty |
| 6 | จำนวนเบิก | input field |
| 7 | **หน่วยใหญ่** | p.display_unit \|\| field.unit |
| 8 | **ค่าแปลง** | p.display_to_base_rate \|\| '1.0' |
| 9 | หน่วย | field.unit |
| 10 | ราคา/หน่วย(ราคากลาง) | price from API |
| 11 | ราคา/หน่วย | input field |
| 12 | มูลค่ารวม | calculated |
| 13 | จัดการ | delete button |

## 🧪 **การทดสอบหลังแก้ไข**

### 1. เปิดหน้า http://localhost:3014/inventory
### 2. เลือกงาน 235073 (น้ำจิ้มสุกี้)
### 3. ตรวจสอบคอลัม:

#### ที่ควรเห็น:
- ✅ คอลัมเรียงถูกต้อง ไม่สลับกัน
- ✅ "หน่วยใหญ่" แสดงข้อมูลจาก price database
- ✅ "ค่าแปลง" แสดง conversion rate จาก price database
- ✅ "หน่วย" แสดงหน่วยพื้นฐาน
- ✅ "ราคา/หน่วย(ราคากลาง)" แสดงราคาจาก API

#### ที่ไม่ควรเห็น:
- ❌ input disabled ว่างๆ
- ❌ คอลัมสลับกัน
- ❌ รายการซ้ำ (แถวที่ 7 รหัส 235073)

## 📁 **ไฟล์ที่แก้ไข**

1. **frontend/src/pages/InventoryData.js**
   - ลบ input disabled ที่ไม่จำเป็น
   - ลบ console.logs ที่ใช้สำหรับ debug
   - ทำให้คอลัมเรียงถูกต้อง

## ⚠️ **หมายเหตุ**

- การแก้ไขนี้จะทำให้คอลัมเรียงถูกต้องตาม header
- ลบ console.logs เพื่อความสะอาดของ code
- รักษา functionality ทั้งหมดไว้

## 🎯 **ผลลัพธ์สุดท้าย**

หลังรีเฟรชหน้าเว็บ:
- ✅ คอลัมเรียงถูกต้อง
- ✅ ไม่มี input disabled ว่างๆ
- ✅ "หน่วยใหญ่" และ "ค่าแปลง" แสดงข้อมูลถูกต้อง
- ✅ ราคาแสดงตามที่คาดหวัง
