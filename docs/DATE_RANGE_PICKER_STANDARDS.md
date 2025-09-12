# มาตรฐานการใช้งานและออกแบบตัวเลือกช่วงวันที่ (Date Range Picker)

เอกสารนี้อธิบายแนวทางมาตรฐานสำหรับตัวเลือกช่วงวันที่ของระบบ ทั้ง UX รูปแบบข้อมูล การจัดการ Timezone และสัญญาการเรียก API เพื่อให้ทีมพัฒนาใช้อย่างสอดคล้อง ลดบั๊ก และดูแลง่ายในอนาคต

---

## 1) วัตถุประสงค์
- ให้ผู้ใช้เลือกช่วงวันที่ได้ชัดเจน ใช้งานง่าย คาดเดาได้
- ลดปัญหา Timezone shift และความไม่สอดคล้องของรูปแบบวันที่
- กำหนด single source of truth และสัญญากับ Backend ที่ชัดเจน

---

## 2) หลักการสำคัญ (Key Principles)
1) Date-only, Inclusive Range
- ตีความวันที่เป็น “วันล้วน” (ไม่ยุ่งกับเวลา)
- ใช้มาตรฐานช่วงแบบ inclusive/inclusive: start ≤ date ≤ end

2) Timezone-safe Formatting
- ห้ามใช้ `toISOString().split('T')[0]` (เสี่ยงเลื่อนวัน)
- ให้ใช้การฟอร์แมตแบบ manual เป็น `YYYY-MM-DD`

3) Single Source of Truth
- ต่อหนึ่งแท็บ (Production/Attendance) มี state:
  - `selectedRange`: ช่วงวันที่ใน UI
  - `appliedRange`: ช่วงวันที่ที่ใช้ค้นหาจริง (ล็อกเมื่อกดค้นหา)

4) Validation ที่เสถียร
- ไม่ครบทั้ง start และ end → error
- start > end → แจ้ง error หรือ auto-correct (ต้องกำหนดนโยบายชัดเจน)

---

## 3) รูปแบบ/สัญญา (Contracts)
### 3.1 รูปแบบวันที่กับ Backend
- ใช้ `YYYY-MM-DD` (String)
- ตัวอย่าง: `GET /logs/summary?from=2025-08-01&to=2025-08-31&q=235001`

### 3.2 Helper ฟอร์แมตวันที่ (ป้องกัน Timezone)
```ts
function formatYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

### 3.3 การ parse จาก Backend (ถ้าเป็น `YYYY-MM-DD`)
```ts
function parseYYYYMMDDLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1); // ใช้ constructor แบบตัวเลข ไม่ใช้ new Date(string)
}
```

---

## 4) Workflow การใช้งาน (มาตรฐาน)
1) ผู้ใช้เลือกช่วงวันที่ใน Range Picker → อัปเดต `selectedRange` (Date | null)
2) แสดง validation ใต้ตัวเลือกหากไม่ถูกต้อง
3) เมื่อกด “ค้นหา”
   - ตรวจสอบ `selectedRange`
   - สร้าง `from`/`to` ด้วย `formatYYYYMMDD`
   - เรียก API และเซ็ต `appliedRange` เป็น snapshot ที่ใช้จริง
4) UI ที่อ้างวันที่ (หัวตาราง/ชื่อไฟล์) ต้องดึงจาก `appliedRange` เท่านั้น

---

## 5) Validation Rules (Date-only)
- Empty: ไม่ครบทั้ง start และ end → `กรุณาเลือกวันที่ให้ครบถ้วน`
- Order: start > end → `วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด` (หรือ auto-correct ตามนโยบาย)

---

## 6) มาตรฐาน UX/UI
- Placeholder: “วันที่เริ่มต้น”, “วันที่สิ้นสุด”
- Locale ไทยเต็มรูปแบบ (ชื่อเดือน/วัน) แสดงผล `DD/MM/YYYY` ใน UI
- ปุ่มลัด: วันนี้, ต้นเดือน–วันนี้
- ปุ่ม “ค้นหา” เดียวรองรับทั้งช่วงวันที่และคำค้นหา
- ปุ่ม “ล้างค่า” เคลียร์ช่วงวันที่/คำค้นหา และลบ error state

---

## 7) ตัวอย่างโค้ด – เรียกค้นหา (ย่อ)
```ts
const handleSearch = async () => {
  if (!selectedRange.startDate || !selectedRange.endDate) {
    setError('กรุณาเลือกวันที่ให้ครบถ้วน');
    return;
  }
  if (selectedRange.startDate > selectedRange.endDate) {
    setError('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
    return;
  }

  const from = formatYYYYMMDD(selectedRange.startDate);
  const to = formatYYYYMMDD(selectedRange.endDate);

  setAppliedRange({ from, to });
  await api.get('/logs/summary', { params: { from, to, q } });
};
```

---

## 8) Timezone – สิ่งที่ “ห้ามทำ” และ “ควรทำ”
ห้ามทำ:
- `toISOString().split('T')[0]`
- `new Date('YYYY-MM-DD')`

ควรทำ:
- ใช้ `formatYYYYMMDD(date)` เมื่อส่ง `YYYY-MM-DD`
- ใช้ `parseYYYYMMDDLocal(s)` เมื่อรับจาก Backend

---

## 9) การตั้งชื่อไฟล์ / หัวตาราง
- ใช้ `appliedRange` เพื่อความถูกต้อง
- ตัวอย่าง: `logs_${from}_${to}.xls`

---

## 10) Checklist การทดสอบ
- ข้ามเดือน (31/07 → 01/08) ต้องไม่เลื่อนวัน
- ปลายเดือน/ปลายปี (28–31, 31/12 → 01/01)
- Locale ไทยในปฏิทิน/ UI
- Inclusive range ครบสองขอบ
- ปุ่มลัดทำงานถูกต้อง
- กดค้นหาหลังแก้วัน → หัวรายงาน/ชื่อไฟล์อัปเดตตาม `appliedRange`

---

## 11) สรุป
แนวทางนี้ทำให้ Date Range Picker มีพฤติกรรมสอดคล้อง เสถียร และปลอดภัยจาก Timezone โดยยึด `YYYY-MM-DD`, ใช้ single source of truth และ inclusive range ทั้งฝั่ง UI และ Backend
