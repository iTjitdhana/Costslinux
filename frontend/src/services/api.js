import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.0.94:3104/api';

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
    console.log('API Request:', config.method?.toUpperCase(), config.url);
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
    console.log('API Response:', response.status, response.config.url);
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
  updateStatus: (id, status) => api.patch(`/batches/${id}/status`, { status }),
  
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
  
  // บันทึกการตวงวัตถุดิบ
  recordWeighing: (data) => api.post('/materials/weighing', data),
  
  // ดึงข้อมูลการใช้วัตถุดิบของล็อต
  getUsage: (batchId) => api.get(`/materials/usage/${batchId}`),
  
  // สรุปการใช้วัตถุดิบของล็อต
  getSummary: (batchId) => api.get(`/materials/summary/${batchId}`),
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
  getLogsTest: () => api.get('/costs/logs-test'),
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
