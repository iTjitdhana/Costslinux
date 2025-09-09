# แก้ไขปัญหา Material ID Mapping สำหรับราคา

## 🔍 **ปัญหาที่พบ**

### ราคา/หน่วย(ราคากลาง) แสดงเป็น `-` ทั้งหมด แม้ว่าจะมีราคาใน database

## ✅ **การวิเคราะห์ปัญหา**

### 1. ตรวจสอบข้อมูล BOM
```json
{
  "Raw_Code": "411041",
  "material_id": 45,  // ← ใช้ material_id นี้ในการดึงราคา
  "Mat_Name": "ซอสหอยนางรม ง่วนเชียง 770 กรัม - CT"
}
```

### 2. ตรวจสอบข้อมูลราคาใน Database
```json
{
  "material_id": 411041,  // ← Raw_Code เดียวกัน แต่ material_id ต่างกัน
  "material_name": "ซอสหอยนางรม ง่วนเชียง 770 กรัม - CT",
  "price_per_unit": "37.660000"
}
```

### 3. ปัญหาที่พบ
- **BOM ใช้ `material_id: 45`** ในการดึงราคา
- **Database มีราคาสำหรับ `material_id: 411041`** (ซึ่งเป็น Raw_Code เดียวกัน)
- **ไม่มีราคาสำหรับ `material_id: 45`**

## ✅ **การแก้ไขที่ทำ**

### แก้ไข Material ID Mapping ใน InventoryData.js

```javascript
// ❌ เดิม - ใช้ material_id สำหรับ Raw Materials
material_id: (item.is_fg === '1' || item.is_fg === 1) ? item.Mat_Id : item.material_id

// ✅ ใหม่ - ใช้ Raw_Code สำหรับ Raw Materials  
material_id: (item.is_fg === '1' || item.is_fg === 1) ? item.Mat_Id : item.Raw_Code
```

### เหตุผล
- **FG (Finished Goods)**: ใช้ `Mat_Id` (เช่น 235191)
- **Raw Materials**: ใช้ `Raw_Code` (เช่น 411041, 413001, 411011, 413012)

## 🧪 **การทดสอบหลังแก้ไข**

### API Test Results
```bash
curl "http://localhost:3104/api/prices/latest-batch?material_ids=413001,411041,411011,413012"
```

**ผลลัพธ์:**
```json
[
  {
    "material_id": 413001,
    "material_name": "ชูรส 20 กก.(ถุงละ 1 กก) - CT",
    "price_per_unit": "87.000000"
  },
  {
    "material_id": 411041,
    "material_name": "ซอสหอยนางรม ง่วนเชียง 770 กรัม - CT", 
    "price_per_unit": "37.660000"
  },
  {
    "material_id": 411011,
    "material_name": "ซีอิ๊วขาวสูตร 3 ตราเด็กสมบูรณ์ 700 CC. - CT",
    "price_per_unit": "41.430000"
  },
  {
    "material_id": 413012,
    "material_name": "น้ำตาลทรายขาวบริสุทธิ์ 1 กก. - CT",
    "price_per_unit": "0.000000"  // ไม่มีราคา
  }
]
```

## 🎯 **ผลลัพธ์ที่คาดหวัง**

### หลังแก้ไขแล้ว หน้า Inventory ควรแสดง:
- **ชูรส 20 กก.**: ราคา 87.00 บาท/กก.
- **ซอสหอยนางรม**: ราคา 37.66 บาท/กก.
- **ซีอิ๊วขาว**: ราคา 41.43 บาท/กก.
- **น้ำตาลทราย**: ราคา 0.00 บาท/กก. (หรือ -)

## 📁 **ไฟล์ที่แก้ไข**

1. **frontend/src/pages/InventoryData.js**
   - แก้ไข material_id mapping ในฟังก์ชัน `loadBOMByJobCode`
   - เปลี่ยนจาก `item.material_id` เป็น `item.Raw_Code` สำหรับ Raw Materials

## 🔧 **การทำงานของระบบ**

### ก่อนแก้ไข:
1. BOM ส่ง `material_id: 45` ไปยัง API
2. API ค้นหาใน `default_itemvalue` ด้วย `material_id: 45`
3. ไม่พบข้อมูล → ส่งคืน `[]`
4. Frontend แสดงราคาเป็น `-`

### หลังแก้ไข:
1. BOM ส่ง `material_id: 411041` (Raw_Code) ไปยัง API
2. API ค้นหาใน `default_itemvalue` ด้วย `material_id: 411041`
3. พบข้อมูล → ส่งคืนราคา
4. Frontend แสดงราคา 37.66 บาท/กก.

## ⚠️ **หมายเหตุ**

- การแก้ไขนี้จะทำให้ราคาแสดงได้สำหรับ Raw Materials ที่มี Raw_Code ตรงกับ material_id ใน database
- FG (Finished Goods) ยังคงใช้ Mat_Id เหมือนเดิม
- หาก Raw_Code ไม่ตรงกับ material_id ใน database ราคาจะยังแสดงเป็น `-`

## 🧪 **การทดสอบ**

1. เปิดหน้า http://localhost:3014/inventory
2. เลือกงานที่มี BOM (เช่น 235191)
3. ตรวจสอบว่า:
   - ชูรส 20 กก. แสดงราคา 87.00 บาท/กก.
   - ซอสหอยนางรม แสดงราคา 37.66 บาท/กก.
   - ซีอิ๊วขาว แสดงราคา 41.43 บาท/กก.
   - น้ำตาลทราย แสดงราคา 0.00 บาท/กก. (หรือ -)
