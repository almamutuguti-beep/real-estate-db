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

// A lease in one of these states blocks removing a property.
const ACTIVE_LEASE_STATUSES = ['Signed', 'Active'];

async function hasActiveLease(propertyId) {
  const [rows] = await db.query(
    'SELECT COUNT(*) AS n FROM lease_agreement WHERE property_id = ? AND status IN (?)',
    [propertyId, ACTIVE_LEASE_STATUSES]
  );
  return rows[0].n > 0;
}

async function findOwned(propertyId, ownerId) {
  const [rows] = await db.query(
    'SELECT property_id, status FROM property WHERE property_id = ? AND property_owner_id = ?',
    [propertyId, ownerId]
  );
  return rows[0];
}

async function softRemove(req, res) {
  const id = Number(req.params.propertyId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid property id' });
  }
  try {
    const property = await findOwned(id, req.ownerId);
    if (!property || property.status === 'Removed') {
      return res.status(404).json({ error: 'Property not found' });
    }
    if (await hasActiveLease(id)) {
      return res.status(409).json({
        error: 'Property cannot be removed while it has an active lease',
        code: 'ACTIVE_LEASE_CONFLICT',
      });
    }
    await db.query(
      "UPDATE property SET status = 'Removed' WHERE property_id = ? AND property_owner_id = ?",
      [id, req.ownerId]
    );
    res.json({ data: { property_id: id, status: 'Removed' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// PATCH /api/properties/:propertyId
router.patch('/:propertyId', async (req, res) => {
  const id = Number(req.params.propertyId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid property id' });
  }

  const body = req.body || {};
  const sets = [];
  const params = [];

  if ('address' in body) {
    if (typeof body.address !== 'string' || !body.address.trim() || body.address.length > 255) {
      return res.status(400).json({ error: 'A valid address is required', code: 'INVALID_ADDRESS' });
    }
    sets.push('address = ?');
    params.push(body.address.trim());
  }
  if ('propertyType' in body) {
    if (body.propertyType !== null && (typeof body.propertyType !== 'string' || body.propertyType.length > 50)) {
      return res.status(400).json({ error: 'Invalid propertyType' });
    }
    sets.push('property_type = ?');
    params.push(body.propertyType);
  }
  for (const [key, column] of [['bedrooms', 'bedrooms'], ['bathrooms', 'bathrooms']]) {
    if (key in body) {
      const v = body[key];
      if (v !== null && (!Number.isInteger(v) || v < 0)) {
        return res.status(400).json({ error: `${key} must be a whole number, 0 or more` });
      }
      sets.push(`${column} = ?`);
      params.push(v);
    }
  }
  if ('monthlyRent' in body) {
    const rent = Number(body.monthlyRent);
    if (!Number.isFinite(rent) || rent <= 0) {
      return res.status(400).json({ error: 'monthlyRent must be a positive number', code: 'INVALID_RENT' });
    }
    sets.push('monthly_rent = ?');
    params.push(rent);
  }
  if ('status' in body) {
    if (!VALID_STATUS.includes(body.status)) {
      return res.status(400).json({ error: 'Invalid status', code: 'INVALID_STATUS' });
    }
    sets.push('status = ?');
    params.push(body.status);
  }

  if (sets.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    const property = await findOwned(id, req.ownerId);
    if (!property || property.status === 'Removed') {
      return res.status(404).json({ error: 'Property not found' });
    }
    if (body.status === 'Removed' && (await hasActiveLease(id))) {
      return res.status(409).json({
        error: 'Property cannot be removed while it has an active lease',
        code: 'ACTIVE_LEASE_CONFLICT',
      });
    }

    await db.query(
      `UPDATE property SET ${sets.join(', ')} WHERE property_id = ? AND property_owner_id = ?`,
      [...params, id, req.ownerId]
    );
    const [rows] = await db.query(`SELECT ${COLUMNS} FROM property WHERE property_id = ?`, [id]);
    res.json({ data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/properties/:propertyId (same soft delete as PATCH status = Removed)
router.delete('/:propertyId', softRemove);

module.exports = router;