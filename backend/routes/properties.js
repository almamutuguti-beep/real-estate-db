const express = require('express');
const db = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireOwner);

const VALID_STATUS = ['Available', 'Rented', 'Removed'];

const COLUMNS = `property_id, address, property_type, bedrooms, bathrooms,
                 monthly_rent, status, create_date`;

// GET /api/properties?search=harbor&status=Available
router.get('/', async (req, res) => {
  const { search = '', status } = req.query;
  const params = [req.ownerId];
  let sql = `SELECT ${COLUMNS} FROM property WHERE property_owner_id = ?`;

  if (status) {
    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: 'Invalid status', code: 'INVALID_STATUS' });
    }
    sql += ' AND status = ?';
    params.push(status);
  } else {
    sql += " AND status <> 'Removed'";
  }

  if (search) {
    sql += ' AND (address LIKE ? OR property_type LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY create_date DESC';

  try {
    const [rows] = await db.query(sql, params);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/properties/:propertyId
router.get('/:propertyId', async (req, res) => {
  const id = Number(req.params.propertyId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid property id' });
  }
  try {
    const [rows] = await db.query(
      `SELECT ${COLUMNS} FROM property
       WHERE property_id = ? AND property_owner_id = ?`,
      [id, req.ownerId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Property not found' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/properties
router.post('/', async (req, res) => {
  const { address, propertyType, bedrooms, bathrooms, monthlyRent } = req.body || {};

  if (typeof address !== 'string' || !address.trim() || address.length > 255) {
    return res.status(400).json({ error: 'A valid address is required', code: 'INVALID_ADDRESS' });
  }
  const rent = Number(monthlyRent);
  if (!Number.isFinite(rent) || rent <= 0) {
    return res.status(400).json({ error: 'monthlyRent must be a positive number', code: 'INVALID_RENT' });
  }
  for (const [name, value] of [['bedrooms', bedrooms], ['bathrooms', bathrooms]]) {
    if (value !== undefined && value !== null && (!Number.isInteger(value) || value < 0)) {
      return res.status(400).json({ error: `${name} must be a whole number, 0 or more` });
    }
  }
  if (propertyType != null && (typeof propertyType !== 'string' || propertyType.length > 50)) {
    return res.status(400).json({ error: 'Invalid propertyType' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO property
         (property_owner_id, address, property_type, bedrooms, bathrooms, monthly_rent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.ownerId, address.trim(), propertyType ?? null, bedrooms ?? null, bathrooms ?? null, rent]
    );
    const [rows] = await db.query(
      `SELECT ${COLUMNS} FROM property WHERE property_id = ?`,
      [result.insertId]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;