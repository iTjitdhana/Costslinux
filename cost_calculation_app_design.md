# ออกแบบระบบเว็บแอพคำนวณต้นทุนการผลิต

## สถาปัตยกรรมระบบ
- **Frontend**: React.js
- **Backend**: Node.js + Express.js
- **Database**: MySQL
- **Module**: ส่วนหนึ่งของระบบ Inventory

## โครงสร้างโปรเจค

```
cost-calculation-app/
├── frontend/                 # React App
│   ├── src/
│   │   ├── components/
│   │   │   ├── BatchList.jsx
│   │   │   ├── BatchForm.jsx
│   │   │   ├── MaterialWeighing.jsx
│   │   │   ├── ProductionResult.jsx
│   │   │   ├── CostCalculation.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── pages/
│   │   │   ├── Batches.jsx
│   │   │   ├── Weighing.jsx
│   │   │   ├── Production.jsx
│   │   │   └── Reports.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── batchService.js
│   │   └── utils/
│   │       └── calculations.js
├── backend/                  # Node.js API
│   ├── routes/
│   │   ├── batches.js
│   │   ├── materials.js
│   │   ├── production.js
│   │   └── costs.js
│   ├── controllers/
│   │   ├── batchController.js
│   │   ├── materialController.js
│   │   ├── productionController.js
│   │   └── costController.js
│   ├── models/
│   │   ├── Batch.js
│   │   ├── MaterialUsage.js
│   │   └── ProductionResult.js
│   ├── database/
│   │   ├── connection.js
│   │   └── migrations/
│   └── utils/
│       └── costCalculator.js
└── database/                 # SQL Scripts
    ├── create_tables.sql
    ├── sample_data.sql
    └── views.sql
```

## หน้าจอหลัก (React Components)

### 1. **หน้าจัดการล็อตการผลิต (Batch Management)**
```jsx
// BatchList.jsx
const BatchList = () => {
  const [batches, setBatches] = useState([]);
  
  return (
    <div className="batch-list">
      <h2>ล็อตการผลิต</h2>
      <table>
        <thead>
          <tr>
            <th>รหัสล็อต</th>
            <th>ผลิตภัณฑ์</th>
            <th>ปริมาณที่วางแผน</th>
            <th>สถานะ</th>
            <th>วันที่เริ่ม</th>
            <th>การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          {batches.map(batch => (
            <tr key={batch.id}>
              <td>{batch.batch_code}</td>
              <td>{batch.fg_name}</td>
              <td>{batch.planned_qty} {batch.unit}</td>
              <td>
                <span className={`status ${batch.status}`}>
                  {getStatusText(batch.status)}
                </span>
              </td>
              <td>{formatDate(batch.start_time)}</td>
              <td>
                <button onClick={() => startWeighing(batch.id)}>
                  เริ่มตวงวัตถุดิบ
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### 2. **หน้าตวงวัตถุดิบ (Material Weighing)**
```jsx
// MaterialWeighing.jsx
const MaterialWeighing = ({ batchId }) => {
  const [materials, setMaterials] = useState([]);
  const [weighedMaterials, setWeighedMaterials] = useState({});
  
  const handleWeighing = (materialId, actualQty) => {
    setWeighedMaterials(prev => ({
      ...prev,
      [materialId]: actualQty
    }));
  };
  
  const saveWeighing = async () => {
    try {
      await api.post('/materials/weighing', {
        batch_id: batchId,
        materials: weighedMaterials
      });
      // บันทึกสำเร็จ
    } catch (error) {
      console.error('Error saving weighing data:', error);
    }
  };
  
  return (
    <div className="material-weighing">
      <h3>การตวงวัตถุดิบ - ล็อต {batchId}</h3>
      <div className="weighing-form">
        {materials.map(material => (
          <div key={material.id} className="material-item">
            <label>{material.name}</label>
            <div className="weighing-inputs">
              <span>วางแผน: {material.planned_qty} {material.unit}</span>
              <input
                type="number"
                placeholder="จำนวนจริง"
                onChange={(e) => handleWeighing(material.id, e.target.value)}
              />
              <span>{material.unit}</span>
              <span>ราคา: {material.price} บาท/{material.unit}</span>
            </div>
          </div>
        ))}
        <button onClick={saveWeighing}>บันทึกการตวง</button>
      </div>
    </div>
  );
};
```

### 3. **หน้าบันทึกผลผลิต (Production Results)**
```jsx
// ProductionResult.jsx
const ProductionResult = ({ batchId }) => {
  const [productionData, setProductionData] = useState({
    good_qty: 0,
    defect_qty: 0
  });
  
  const saveProductionResult = async () => {
    try {
      await api.post('/production/results', {
        batch_id: batchId,
        ...productionData
      });
      // บันทึกสำเร็จ
    } catch (error) {
      console.error('Error saving production result:', error);
    }
  };
  
  return (
    <div className="production-result">
      <h3>บันทึกผลผลิต - ล็อต {batchId}</h3>
      <div className="result-form">
        <div className="form-group">
          <label>สินค้าดี (กก.)</label>
          <input
            type="number"
            value={productionData.good_qty}
            onChange={(e) => setProductionData(prev => ({
              ...prev,
              good_qty: parseFloat(e.target.value)
            }))}
          />
        </div>
        <div className="form-group">
          <label>สินค้าเสีย (กก.)</label>
          <input
            type="number"
            value={productionData.defect_qty}
            onChange={(e) => setProductionData(prev => ({
              ...prev,
              defect_qty: parseFloat(e.target.value)
            }))}
          />
        </div>
        <div className="summary">
          <p>รวม: {productionData.good_qty + productionData.defect_qty} กก.</p>
        </div>
        <button onClick={saveProductionResult}>บันทึกผลผลิต</button>
      </div>
    </div>
  );
};
```

### 4. **หน้าคำนวณต้นทุน (Cost Calculation)**
```jsx
// CostCalculation.jsx
const CostCalculation = ({ batchId }) => {
  const [costData, setCostData] = useState(null);
  
  useEffect(() => {
    loadCostData();
  }, [batchId]);
  
  const loadCostData = async () => {
    try {
      const response = await api.get(`/costs/calculation/${batchId}`);
      setCostData(response.data);
    } catch (error) {
      console.error('Error loading cost data:', error);
    }
  };
  
  if (!costData) return <div>กำลังโหลด...</div>;
  
  return (
    <div className="cost-calculation">
      <h3>คำนวณต้นทุน - ล็อต {batchId}</h3>
      <div className="cost-summary">
        <div className="cost-item">
          <h4>ต้นทุนวัตถุดิบ</h4>
          <p className="amount">{costData.total_material_cost.toFixed(2)} บาท</p>
          <p>ปริมาณรวม: {costData.total_material_qty} กก.</p>
        </div>
        
        <div className="cost-item">
          <h4>ต้นทุนแรงงาน</h4>
          <p className="amount">{costData.labor_cost.toFixed(2)} บาท</p>
          <p>เวลาใช้: {costData.total_minutes} นาที</p>
        </div>
        
        <div className="cost-item">
          <h4>ผลผลิต</h4>
          <p>สินค้าดี: {costData.good_qty} กก.</p>
          <p>สินค้าเสีย: {costData.defect_qty} กก.</p>
          <p>Yield: {costData.yield_percent.toFixed(2)}%</p>
        </div>
        
        <div className="cost-item total">
          <h4>ต้นทุนต่อหน่วย</h4>
          <p className="amount">{costData.total_cost_per_unit.toFixed(2)} บาท/กก.</p>
        </div>
      </div>
    </div>
  );
};
```

## Backend API (Node.js)

### 1. **API Routes**
```javascript
// routes/batches.js
const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');

router.get('/', batchController.getAllBatches);
router.get('/:id', batchController.getBatchById);
router.post('/', batchController.createBatch);
router.put('/:id/status', batchController.updateBatchStatus);

module.exports = router;
```

### 2. **Controllers**
```javascript
// controllers/batchController.js
const Batch = require('../models/Batch');
const CostCalculator = require('../utils/costCalculator');

exports.getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.findAll();
    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const { work_plan_id, fg_code, planned_qty } = req.body;
    const batch = await Batch.create({
      work_plan_id,
      batch_code: generateBatchCode(),
      fg_code,
      planned_qty,
      start_time: new Date(),
      status: 'preparing'
    });
    res.status(201).json(batch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### 3. **Models**
```javascript
// models/Batch.js
const db = require('../database/connection');

class Batch {
  static async findAll() {
    const [rows] = await db.execute(`
      SELECT 
        pb.*,
        fg.FG_Name as fg_name,
        fg.FG_Unit as unit
      FROM production_batches pb
      JOIN fg ON pb.fg_code = fg.FG_Code
      ORDER BY pb.created_at DESC
    `);
    return rows;
  }
  
  static async findById(id) {
    const [rows] = await db.execute(`
      SELECT * FROM production_batches WHERE id = ?
    `, [id]);
    return rows[0];
  }
  
  static async create(batchData) {
    const [result] = await db.execute(`
      INSERT INTO production_batches 
      (work_plan_id, batch_code, fg_code, planned_qty, start_time, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      batchData.work_plan_id,
      batchData.batch_code,
      batchData.fg_code,
      batchData.planned_qty,
      batchData.start_time,
      batchData.status
    ]);
    return { id: result.insertId, ...batchData };
  }
}

module.exports = Batch;
```

### 4. **Cost Calculator Utility**
```javascript
// utils/costCalculator.js
const db = require('../database/connection');

class CostCalculator {
  static async calculateBatchCost(batchId) {
    const [rows] = await db.execute(`
      SELECT * FROM v_batch_cost_calculation WHERE batch_id = ?
    `, [batchId]);
    
    if (rows.length === 0) {
      throw new Error('Batch not found');
    }
    
    const costData = rows[0];
    
    return {
      batch_id: costData.batch_id,
      batch_code: costData.batch_code,
      fg_code: costData.fg_code,
      total_material_cost: costData.total_material_cost,
      total_material_qty: costData.total_material_qty,
      total_minutes: costData.total_minutes,
      labor_cost: (costData.total_minutes / 60) * 480, // 480 บาท/ชั่วโมง
      good_qty: costData.good_qty,
      defect_qty: costData.defect_qty,
      total_qty: costData.total_qty,
      yield_percent: costData.yield_percent,
      material_cost_per_unit: costData.material_cost_per_unit,
      total_cost_per_unit: costData.total_cost_per_unit
    };
  }
}

module.exports = CostCalculator;
```

## การใช้งาน

### 1. **เริ่มต้นล็อตการผลิต**
- เลือกจาก Workplan ที่มีอยู่
- ระบบจะสร้างล็อตใหม่และดึงสูตร BOM มา

### 2. **ตวงวัตถุดิบ**
- แสดงรายการวัตถุดิบจาก BOM
- บันทึกจำนวนที่ใช้จริง
- คำนวณต้นทุนวัตถุดิบอัตโนมัติ

### 3. **บันทึกผลผลิต**
- บันทึกน้ำหนัก FG ที่ได้จริง
- แยกสินค้าดีและเสีย
- คำนวณ Yield

### 4. **ดูต้นทุน**
- แสดงต้นทุนแยกประเภท
- คำนวณต้นทุนต่อหน่วย
- เปรียบเทียบกับแผน

## การเชื่อมต่อกับระบบ Inventory

```javascript
// เชื่อมต่อกับ Workplan
const workPlans = await api.get('/workplans?date=' + today);

// เชื่อมต่อกับ Logs
const logs = await api.get(`/logs?batch_id=${batchId}`);

// อัพเดท Inventory
await api.post('/inventory/update', {
  material_id: materialId,
  qty_used: actualQty,
  batch_id: batchId
});
```

ระบบนี้จะช่วยให้คุณ:
- ✅ บันทึกข้อมูลการผลิตได้ง่าย
- ✅ คำนวณต้นทุนได้แม่นยำ
- ✅ ติดตามประสิทธิภาพการผลิต
- ✅ เชื่อมต่อกับระบบ Inventory ได้
- ✅ ดูรายงานและวิเคราะห์ได้
