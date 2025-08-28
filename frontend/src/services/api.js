import axios from 'axios';

// เลือก API base URL แบบยืดหยุ่น:
// - ใช้ REACT_APP_API_URL ถ้ามี (เช่น ตั้งใน .env)
// - ถ้าไม่มีกำหนด ให้ใช้งาน host ปัจจุบัน + พอร์ต 3104
const DEFAULT_API_BASE_URL = (() => {
  try {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${host}:3104/api`;
  } catch (e) {
    return 'http://localhost:3104/api';
  }
})();
const API_BASE_URL = process.env.REACT_APP_API_URL || DEFAULT_API_BASE_URL;

// สร้าง axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// API functions
export const batchAPI = {
  // ดึงรายการล็อตทั้งหมด
  getAll: () => api.get('/batches'),
  getWorkPlansByDate: (date) => api.get(`/batches/work-plans/${date}`),
  
  // ดึงข้อมูลล็อตตาม ID
  getById: (id) => api.get(`/batches/${id}`),
  
  // สร้างล็อตใหม่
  create: (data) => api.post('/batches', data),
  
  // อัพเดทสถานะล็อต
  updateStatus: (id, status) => api.put(`/batches/${id}/status`, { status }),
  
  // ดึงล็อตตาม work plan
  getByWorkPlan: (workPlanId) => api.get(`/batches/workplan/${workPlanId}`),
};

export const materialAPI = {
  // ดึงรายการวัตถุดิบทั้งหมด
  getAll: () => api.get('/materials'),
  
  // ค้นหาวัตถุดิบ
  search: (query) => api.get(`/materials/search?q=${encodeURIComponent(query)}`),
  
  // สร้างวัตถุดิบใหม่
  create: (data) => api.post('/materials', data),
  
  // ดึง BOM ตามรหัสผลิตภัณฑ์
  getBOM: (fgCode) => api.get(`/materials/bom/${fgCode}`),
  
  // ดึง BOM ตาม job_code จาก workplan
  getBOMByJobCode: (jobCode) => api.get(`/materials/bom/job/${jobCode}`),
  
  // บันทึกการตวงวัตถุดิบ
  recordWeighing: (data) => api.post('/materials/weighing', data),
  
  // บันทึกข้อมูลทั้งหมด (วัตถุดิบ + ผลผลิต)
  saveInventoryData: (workplanId, rawMaterials, fgMaterials) => api.post('/materials/inventory', { 
    batch_id: workplanId, 
    raw_materials: rawMaterials || [],
    fg_materials: fgMaterials || []
  }),
  
  // ดึงข้อมูลที่เคยบันทึก
  getSavedInventoryData: (workplanId) => api.get(`/materials/inventory/${workplanId}`),
  
  // ดึงข้อมูลการใช้วัตถุดิบของล็อต
  getUsage: (batchId) => api.get(`/materials/usage/${batchId}`),
  
  // สรุปการใช้วัตถุดิบของล็อต
  getSummary: (batchId) => api.get(`/materials/summary/${batchId}`),
};

export const workplanAPI = {
  // ดึงรายการงานทั้งหมด
  getAll: () => api.get('/workplans'),
  
  // ดึงงานตาม ID
  getById: (id) => api.get(`/workplans/${id}`),
  
  // ดึงงานตามวันที่
  getByDate: (date) => api.get(`/workplans/date/${date}`),
  
  // ดึงงานที่ยังไม่เสร็จ
  getActive: () => api.get('/workplans/active'),
};

export const productionAPI = {
  // บันทึกผลผลิต
  recordResults: (data) => api.post('/production/results', data),
  
  // ดึงผลผลิตของล็อต
  getResults: (batchId) => api.get(`/production/results/${batchId}`),
  
  // ดึง logs การผลิตของล็อต
  getLogs: (batchId) => api.get(`/production/logs/${batchId}`),
  
  // บันทึก log การผลิต
  recordLog: (data) => api.post('/production/logs', data),
  
  // สรุปการผลิตของล็อต
  getSummary: (batchId) => api.get(`/production/summary/${batchId}`),
};

export const costAPI = {
  // คำนวณต้นทุนการผลิต
  calculate: (data) => api.post('/costs/calculate', data),

  // ดึงข้อมูลต้นทุนของล็อต
  getByBatch: (batchId) => api.get(`/costs/batch/${batchId}`),

  // สรุปต้นทุนตามวันที่
  getSummary: (params) => api.get('/costs/summary', { params }),

  // ข้อมูลต้นทุนแบบละเอียด
  getDetailed: (batchId) => api.get(`/costs/detailed/${batchId}`),

  // คำนวณเวลาที่ใช้จาก logs
  getTimeUsed: (batchId) => api.get(`/costs/time-used/${batchId}`),

  // ทดสอบดึงข้อมูล logs
  getLogsTest: (params) => api.get('/costs/logs-test', { params }),

  // สรุปเวลาจาก logs จัดกลุ่มตามงานและวัน
  getLogsSummary: (params) => api.get('/costs/logs-summary', { params }),

  // แนะนำงานสำหรับ autocomplete
  suggestJobs: (params) => api.get('/costs/logs-job-suggest', { params }),

  // ดึงข้อมูล conversion rates ของ FG
  getFGConversionRates: () => api.get('/costs/fg-conversion-rates'),

  // ค้นหา FG สำหรับ autocomplete
  searchFG: (query) => api.get(`/costs/fg/search?q=${encodeURIComponent(query)}`),

  // สร้าง FG ใหม่
  createFG: (data) => api.post('/costs/fg', data),

  // สร้างค่าแปลงหน่วยของ FG (อัพเดทหรือแทรกตาม FG_Code)
  createFGConversionRate: (data) => api.post('/costs/fg-conversion-rates', data),

  // อัพเดทค่าแปลงหน่วยของ FG ตาม id
  updateFGConversionRate: (id, data) => api.put(`/costs/fg-conversion-rates/${id}`, data),

  // ลบค่าแปลงหน่วยของ FG (รีเซ็ตเป็น 1.0000)
  deleteFGConversionRate: (id) => api.delete(`/costs/fg-conversion-rates/${id}`),

  // ดึงข้อมูล conversion rates ของวัตถุดิบ
  getMaterialConversionRates: () => api.get('/costs/material-conversion-rates'),

  // บันทึกต้นทุนและเก็บประวัติ
  saveCost: (data) => api.post('/costs/save', data),

  // ดูเวลาบันทึกครั้งล่าสุดของวัน
  getLastSaved: (params) => api.get('/costs/last-saved', { params }),

  // เพิ่มค่าแปลงหน่วยใหม่
  createMaterialConversionRate: (data) => api.post('/costs/material-conversion-rates', data),

  // อัพเดทค่าแปลงหน่วย
  updateMaterialConversionRate: (id, data) => api.put(`/costs/material-conversion-rates/${id}`, data),

  // ลบค่าแปลงหน่วย
  deleteMaterialConversionRate: (id) => api.delete(`/costs/material-conversion-rates/${id}`),

  // ดึงข้อมูลวัตถุดิบทั้งหมด
  getMaterials: () => api.get('/materials'),
};

export const pricesAPI = {
  getLatest: (params) => api.get('/prices/latest', { params }),
  getLatestByMaterialId: (materialId) => api.get(`/prices/${materialId}`),
  getLatestBatch: (materialIds) => {
    const ids = (materialIds || []).filter((n) => Number.isFinite(n));
    if (ids.length === 0) return Promise.resolve({ data: [] });
    return api.get('/prices/latest-batch', { params: { material_ids: ids.join(',') } });
  },
};

// Utility functions
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(amount);
};

export const formatNumber = (number, decimals = 2) => {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};

// ฟังก์ชันใหม่ที่เก็บความแม่นยำตามต้นฉบับ
export const formatNumberPreservePrecision = (number) => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }
  
  // แปลงเป็น string เพื่อดูจำนวนทศนิยม
  const numStr = String(number);
  const decimalIndex = numStr.indexOf('.');
  
  if (decimalIndex === -1) {
    // ไม่มีทศนิยม
    return new Intl.NumberFormat('th-TH').format(number);
  } else {
    // มีทศนิยม - นับจำนวนตำแหน่ง
    const decimalPlaces = numStr.length - decimalIndex - 1;
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(number);
  }
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatDateTime = (date) => {
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export default api;
