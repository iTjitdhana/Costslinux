const express = require('express');
const router = express.Router();
const { query } = require('../../database/connection');

// GET /api/prices/latest-batch?material_ids=1,2,3&sku_ids=...
router.get('/latest-batch', async (req, res) => {
	try {
		const materialIdsParam = req.query.material_ids || req.query.sku_ids || '';
		const ids = String(materialIdsParam)
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean)
			.map((s) => Number(s))
			.filter((n) => Number.isFinite(n));

		if (ids.length === 0) {
			return res.json([]);
		}

		// Build placeholders for IN clause
		const placeholders = ids.map(() => '?').join(',');
		const sql = `
			SELECT material_id, material_name, display_unit, base_unit, display_to_base_rate,
			       price_per_unit, price_per_base_unit, currency, effective_date, source, created_at
			FROM default_itemvalue.v_latest_material_price
			WHERE material_id IN (${placeholders})
			ORDER BY material_id ASC`;
		const rows = await query(sql, ids);
		res.json(rows);
	} catch (err) {
		console.error('GET /api/prices/latest-batch error:', err);
		res.status(500).json({ error: 'Failed to fetch latest prices (batch)' });
	}
});

// GET /api/prices/latest?material_id=&display_unit=&search=&limit=&sku_id=&sku_unit=
router.get('/latest', async (req, res) => {
	try {
		const { material_id, display_unit, search, limit } = req.query;
		// Backward compatible query params
		const sku_id = req.query.sku_id;
		const sku_unit = req.query.sku_unit;

		const params = [];
		let sql = `
			SELECT material_id, material_name, display_unit, base_unit, display_to_base_rate,
			       price_per_unit, price_per_base_unit, currency, effective_date, source, created_at
			FROM default_itemvalue.v_latest_material_price
			WHERE 1=1`;

		const matId = material_id || sku_id;
		if (matId) {
			sql += ' AND material_id = ?';
			params.push(Number(matId));
		}
		const unit = display_unit || sku_unit;
		if (unit) {
			sql += ' AND display_unit = ?';
			params.push(unit);
		}
		if (search) {
			sql += ' AND material_name LIKE ?';
			params.push(`%${search}%`);
		}

		const lim = Math.min(Math.max(parseInt(limit || '200', 10), 1), 2000);
		sql += ' ORDER BY material_id ASC LIMIT ?';
		params.push(lim);

		const rows = await query(sql, params);
		res.json(rows);
	} catch (err) {
		console.error('GET /api/prices/latest error:', err);
		res.status(500).json({ error: 'Failed to fetch latest prices' });
	}
});

// GET /api/prices/:materialId
router.get('/:materialId', async (req, res) => {
	try {
		const materialId = Number(req.params.materialId);
		if (!Number.isFinite(materialId)) {
			return res.status(400).json({ error: 'Invalid materialId' });
		}
		const rows = await query(
			`SELECT material_id, material_name, display_unit, base_unit, display_to_base_rate,
			        price_per_unit, price_per_base_unit, currency, effective_date, source, created_at
			 FROM default_itemvalue.v_latest_material_price
			 WHERE material_id = ?`,
			[materialId]
		);
		res.json(rows);
	} catch (err) {
		console.error('GET /api/prices/:materialId error:', err);
		res.status(500).json({ error: 'Failed to fetch price' });
	}
});

module.exports = router;
