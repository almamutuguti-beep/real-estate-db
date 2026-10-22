const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/public/properties?search=...   (no login needed)
router.get('/properties', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
  const params = [];
  let sql = `SELECT property_id, address, property_type, bedrooms, bathrooms, monthly_rent
             FROM property WHERE status = 'Available'`;
  if (search) {
    sql += ' AND (address LIKE ? OR property_type LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY create_date DESC LIMIT 50';

  try {
    const [rows] = await db.query(sql, params);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;