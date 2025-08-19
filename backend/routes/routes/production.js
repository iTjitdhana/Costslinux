const express = require('express');
const router = express.Router();
const { query, transaction } = require('../../database/connection');

// POST /api/production/results - บันทึกผลผลิต
router.post('/results', async (req, res) => {
  try {
    const { batch_id, fg_code, good_qty, defect_qty, recorded_by, is_update, good_secondary_qty, good_secondary_unit } = req.body;
    
    if (!batch_id || !fg_code || good_qty === undefined || defect_qty === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: batch_id, fg_code, good_qty, defect_qty'
      });
    }
    
    // ใช้ transaction เพื่อความปลอดภัย
    const result = await transaction(async (connection) => {
      // ถ้าเป็นการอัพเดท ให้ลบข้อมูลเก่าก่อน
      if (is_update) {
        await connection.execute(
          'DELETE FROM batch_production_results WHERE batch_id = ?',
          [batch_id]
        );
      }
      
      // บันทึกผลผลิต
      const sql = `
        INSERT INTO batch_production_results 
        (batch_id, fg_code, good_qty, good_secondary_qty, good_secondary_unit, defect_qty, recorded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      await connection.execute(sql, [
        batch_id, 
        fg_code, 
        good_qty, 
        (good_secondary_qty === undefined || good_secondary_qty === null || good_secondary_qty === '') ? null : good_secondary_qty, 
        (good_secondary_unit === undefined || good_secondary_unit === null || good_secondary_unit === '') ? null : good_secondary_unit, 
        defect_qty, 
        recorded_by
      ]);
      
      // อัพเดทสถานะล็อตเป็น 'completed' (เฉพาะกรณีใหม่)
      if (!is_update) {
        await connection.execute(
          'UPDATE production_batches SET status = ?, end_time = NOW() WHERE id = ?',
          ['completed', batch_id]
        );
      }
      
      return { success: true };
    });
    
    res.status(201).json({
      success: true,
      message: is_update ? 'Production results updated successfully' : 'Production results recorded successfully',
      data: result
    });
  } catch (error) {
    console.error('Error recording production results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record production results',
      message: error.message
    });
  }
});

// GET /api/production/results/:batchId - ดึงผลผลิตของล็อต
router.get('/results/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const sql = `
      SELECT 
        bpr.*, 
        fg.FG_Name as fg_name,
        fg.FG_Unit as unit
      FROM batch_production_results bpr
      LEFT JOIN fg ON bpr.fg_code = fg.FG_Code
      WHERE bpr.batch_id = ?
      ORDER BY bpr.recorded_at DESC
    `;
    
    const results = await query(sql, [batchId]);
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Error fetching production results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch production results',
      message: error.message
    });
  }
});

// GET /api/production/logs/:batchId - ดึง logs การผลิตของล็อต
router.get('/logs/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const sql = `
      SELECT * FROM logs 
      WHERE batch_id = ? 
      ORDER BY timestamp ASC
    `;
    
    const logs = await query(sql, [batchId]);
    
    res.json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error fetching production logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch production logs',
      message: error.message
    });
  }
});

// POST /api/production/logs - บันทึก log การผลิต
router.post('/logs', async (req, res) => {
  try {
    const { batch_id, work_plan_id, process_number, status } = req.body;
    
    if (!batch_id || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: batch_id, status'
      });
    }
    
    const sql = `
      INSERT INTO logs 
      (batch_id, work_plan_id, process_number, status, timestamp)
      VALUES (?, ?, ?, ?, NOW())
    `;
    
    const result = await query(sql, [batch_id, work_plan_id, process_number, status]);
    
    res.status(201).json({
      success: true,
      message: 'Production log recorded successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error recording production log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record production log',
      message: error.message
    });
  }
});

// GET /api/production/summary/:batchId - สรุปการผลิตของล็อต
router.get('/summary/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    // ดึงข้อมูลผลผลิต
    const productionSql = `
      SELECT 
        good_qty,
        defect_qty,
        total_qty,
        yield_percent
      FROM batch_production_results
      WHERE batch_id = ?
    `;
    
    const productionResult = await query(productionSql, [batchId]);
    
    // คำนวณเวลาการผลิตจาก logs
    const timeSql = `
      SELECT 
        SUM(
          CASE 
            WHEN l.status = 'stop' AND l_prev.status = 'start' 
            THEN TIMESTAMPDIFF(MINUTE, l_prev.timestamp, l.timestamp)
            ELSE 0 
          END
        ) as total_minutes
      FROM logs l 
      LEFT JOIN logs l_prev ON l.batch_id = l_prev.batch_id 
        AND l.process_number = l_prev.process_number 
        AND l_prev.timestamp < l.timestamp
      WHERE l.batch_id = ?
    `;
    
    const timeResult = await query(timeSql, [batchId]);
    
    const summary = {
      production: productionResult[0] || {
        good_qty: 0,
        defect_qty: 0,
        total_qty: 0,
        yield_percent: 0
      },
      time: {
        total_minutes: timeResult[0]?.total_minutes || 0,
        total_hours: (timeResult[0]?.total_minutes || 0) / 60
      }
    };
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching production summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch production summary',
      message: error.message
    });
  }
});

module.exports = router;
