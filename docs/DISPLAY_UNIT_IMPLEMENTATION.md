# เพิ่มคอลัม "หน่วยใหญ่ (Display Unit)"

## 🎯 **วัตถุประสงค์**

เพิ่มการแสดง **หน่วยใหญ่ (Display Unit)** โดยดึงข้อมูลจาก price database ที่มีอยู่แล้ว

## ✅ **การแก้ไขที่ทำ**

### แก้ไขคอลัม "หน่วยใหญ่" ใน InventoryData.js

```javascript
// ❌ เดิม - input ว่างๆ ที่ disabled
<td className="px-4 py-3 whitespace-nowrap text-center">
    <input
        type="text"
        className="input w-16 text-center"
        placeholder="-"
        disabled
    />
</td>

// ✅ ใหม่ - แสดง display_unit จาก price data
<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">
    {(() => {
        const p = latestPrices[field.material_id];
        if (!p) return '-';
        return p.display_unit || field.unit;
    })()}
</td>
```

## 📊 **ข้อมูลที่ใช้**

### จาก Price Database (`default_itemvalue.v_latest_material_price`):
```json
{
  "material_id": 411022,
  "material_name": "น้ำมันงา ตรามังกรคู่ 2,840 กรัม - CT",
  "display_unit": "กก.",      // ← หน่วยใหญ่
  "base_unit": "กก.",
  "display_to_base_rate": "1.000000",
  "price_per_unit": "232.140000"
}
```

## 🎯 **ผลลัพธ์ที่คาดหวัง**

### หลังแก้ไขแล้ว คอลัม "หน่วยใหญ่" จะแสดง:

| รายการ | หน่วยใหญ่ | หน่วย |
|--------|-----------|-------|
| น้ำจิ้มสุกี้ | กก. | กก. |
| กระเทียมแกะกลีบ - CT | กก. | กก. |
| กระเทียมดอง (น้ำ) - CT | กก. | กก. |
| กระเทียมดอง (เนื้อ) - CT | กก. | กก. |
| งาขาวคั่ว | กก. | กก. |
| ซอสพริกตราไทยคิว | กก. | กก. |
| น้ำตาลทรายขาว | กก. | กก. |
| น้ำปลาทิพรส | กก. | กก. |
| น้ำมันงา | กก. | กก. |
| รากผักชี - CT | กก. | กก. |
| พริกขี้หนูแดง | กก. | กก. |

## 💡 **Logic การทำงาน**

### 1. ตรวจสอบข้อมูลราคา
```javascript
const p = latestPrices[field.material_id];
```

### 2. แสดงผลตามลำดับความสำคัญ
```javascript
if (!p) return '-';                    // ไม่มีข้อมูลราคา
return p.display_unit || field.unit;   // ใช้ display_unit หรือ fallback เป็น unit
```

### 3. Fallback Strategy
- **ลำดับที่ 1**: `p.display_unit` จาก price database
- **ลำดับที่ 2**: `field.unit` จาก BOM data  
- **ลำดับที่ 3**: `'-'` หากไม่มีข้อมูล

## 🧪 **การทดสอบ**

### 1. เปิดหน้า http://localhost:3014/inventory
### 2. เลือกงาน 235073 (น้ำจิ้มสุกี้)
### 3. ตรวจสอบคอลัม "หน่วยใหญ่":

#### หากมีข้อมูลราคา:
- ✅ แสดง `display_unit` จาก price database
- ✅ หากไม่มี `display_unit` จะแสดง `unit` จาก BOM

#### หากไม่มีข้อมูลราคา:
- ✅ แสดง `-`

## 📁 **ไฟล์ที่แก้ไข**

1. **frontend/src/pages/InventoryData.js**
   - แก้ไขคอลัม "หน่วยใหญ่" ให้แสดง display_unit จาก price data
   - เปลี่ยนจาก disabled input เป็น text display
   - เพิ่ม fallback logic

## ⚠️ **หมายเหตุ**

- การแก้ไขนี้ใช้ข้อมูลที่มีอยู่แล้วใน price database
- ไม่ต้องแก้ไข database schema
- หากต้องการหน่วยใหญ่ที่แตกต่างจาก display_unit สามารถเพิ่มคอลัมใหม่ใน database ได้

## 🔧 **การขยายผลในอนาคต**

### หากต้องการหน่วยใหญ่ที่หลากหลายมากขึ้น:

#### Option 1: เพิ่มคอลัมใน material table
```sql
ALTER TABLE material ADD COLUMN large_unit VARCHAR(50);
UPDATE material SET large_unit = 'ถุง' WHERE Mat_Id = '413012'; -- น้ำตาล
UPDATE material SET large_unit = 'แกลลอน' WHERE Mat_Id = '411022'; -- น้ำมัน
```

#### Option 2: สร้างตาราง unit_conversions
```sql
CREATE TABLE unit_conversions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    material_id VARCHAR(50),
    base_unit VARCHAR(50),
    display_unit VARCHAR(50), 
    large_unit VARCHAR(50),
    conversion_rate DECIMAL(10,6)
);
```

## 🎯 **ผลลัพธ์**

ตอนนี้คอลัม "หน่วยใหญ่" จะแสดงข้อมูลจริงแทนที่จะเป็น input ว่างๆ และจะใช้ข้อมูลจาก price database ที่มีความแม่นยำสูง
