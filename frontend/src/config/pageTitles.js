// ไฟล์ config สำหรับจัดการ title ของทุกหน้า
// แก้ไขที่นี่เพื่อเปลี่ยน title ของทุกหน้า

export const PAGE_TITLES = {
  // หน้าหลัก
  dashboard: {
    title: 'Dashboard',
    subtitle: 'ภาพรวมระบบคำนวณต้นทุนการผลิต'
  },
  
  // หน้าจัดการล็อต
  batchManagement: {
    title: 'สร้างล็อตการผลิตใหม่',
    subtitle: 'ระบบจัดการล็อต'
  },
  
  // หน้าตวงวัตถุดิบ
  materialWeighing: {
    title: 'ตวงวัตถุดิบ',
    subtitle: 'ระบบตวงวัตถุดิบ'
  },
  
  // หน้าบันทึกผลผลิต
  productionResults: {
    title: 'บันทึกผลผลิต',
    subtitle: 'ผลผลิต'
  },
  
  // หน้าคำนวณต้นทุน
  costCalculation: {
    title: 'คำนวณต้นทุนการผลิต',
    subtitle: 'ระบบคำนวณต้นทุน'
  },
  
  // หน้ารายงานต้นทุน
  costReports: {
    title: 'ตารางต้นทุนการผลิต',
    subtitle: 'รายงานต้นทุนการผลิต'
  },
  
  // หน้ารายงานวิเคราะห์ต้นทุน
  costAnalysis: {
    title: 'รายงานวิเคราะห์ต้นทุนการผลิต',
    subtitle: 'ระบบบริหารคลังสินค้า'
  },
  
  // หน้าข้อมูล Inventory
  inventory: {
    title: 'ข้อมูล Inventory',
    subtitle: 'ระบบบันทึกข้อมูลวัตถุดิบ'
  },
  
  // หน้าประวัติการผลิต (Logs)
  logs: {
    title: 'ระบบแสดงข้อมูลการผลิตสินค้าครัวกลาง',
    subtitle: 'ข้อมูลเวลาการผลิตย้อนหลัง–ปัจจุบัน'
  },
  
  // หน้าประวัติการผลิต (Logs Test)
  logsTest: {
    title: 'ระบบแสดงข้อมูลการผลิตสินค้าครัวกลาง',
    subtitle: 'ข้อมูลเวลาการผลิตย้อนหลัง–ปัจจุบัน'
  },
  
  // หน้าจัดการค่าแปลงหน่วย FG
  fgConversion: {
    title: 'จัดการค่าแปลงหน่วยสินค้าสำเร็จรูป (FG)',
    subtitle: 'ระบบบัญชีต้นทุน'
  },
  
  // หน้าจัดการค่าแปลงหน่วยวัตถุดิบ
  materialConversion: {
    title: 'จัดการค่าแปลงหน่วยวัตถุดิบ',
    subtitle: 'ระบบจัดการสต็อก'
  },
  
  // หน้าจัดการ Role
  roleManagement: {
    title: 'จัดการ Role และเมนู',
    subtitle: 'ระบบจัดการครัวกลาง'
  }
};

// ฟังก์ชันสำหรับสร้าง title แบบเต็ม
export const getPageTitle = (pageKey) => {
  const page = PAGE_TITLES[pageKey];
  if (!page) return 'ระบบคำนวณต้นทุนการผลิต';
  return `${page.title} - ${page.subtitle}`;
};

// ฟังก์ชันสำหรับสร้าง title แบบสั้น
export const getPageTitleShort = (pageKey) => {
  const page = PAGE_TITLES[pageKey];
  if (!page) return 'ระบบคำนวณต้นทุนการผลิต';
  return page.title;
};

// ฟังก์ชันสำหรับสร้าง subtitle
export const getPageSubtitle = (pageKey) => {
  const page = PAGE_TITLES[pageKey];
  if (!page) return 'ระบบคำนวณต้นทุนการผลิต';
  return page.subtitle;
};
