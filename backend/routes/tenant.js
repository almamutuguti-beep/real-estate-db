const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function requireTenant(req, res, next) {
  if (req.user.role !== 'Tenant') {
    return res.status(403).json({ error: 'Tenants only' });
  }
  try {
    const [rows] = await db.query('SELECT tenant_id FROM tenant WHERE user_id = ?', [req.user.userId]);
    if (!rows[0]) return res.status(403).json({ error: 'No tenant profile for this account' });
    req.tenantId = rows[0].tenant_id;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

router.use(requireAuth, requireTenant);

const APPLICATION_SELECT = `SELECT ra.rental_application_id, ra.application_date, ra.status,
       p.property_id, p.address, p.property_type, p.monthly_rent
FROM rental_application ra
JOIN property p ON p.property_id = ra.property_id`;

// GET /api/tenant/applications
router.get('/applications', async (req, res) => {
  try {
    const [rows] = await db.query(
      `${APPLICATION_SELECT} WHERE ra.tenant_id = ? ORDER BY ra.application_date DESC, ra.rental_application_id DESC`,
      [req.tenantId]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/tenant/applications   body: { "propertyId": 3 }
router.post('/applications', async (req, res) => {
  const propertyId = Number((req.body || {}).propertyId);
  if (!Number.isInteger(propertyId) || propertyId <= 0) {
    return res.status(400).json({ error: 'A valid propertyId is required', code: 'INVALID_PROPERTY' });
  }
  try {
    const [props] = await db.query(
      "SELECT property_id FROM property WHERE property_id = ? AND status = 'Available'",
      [propertyId]
    );
    if (!props[0]) {
      return res.status(404).json({ error: 'That property is not available', code: 'NOT_AVAILABLE' });
    }
    const [[existing]] = await db.query(
      "SELECT COUNT(*) AS n FROM rental_application WHERE tenant_id = ? AND property_id = ? AND status IN ('Pending','Approved')",
      [req.tenantId, propertyId]
    );
    if (existing.n > 0) {
      return res.status(409).json({ error: 'You already applied for this property', code: 'ALREADY_APPLIED' });
    }
    const [result] = await db.query(
      'INSERT INTO rental_application (tenant_id, property_id, application_date) VALUES (?, ?, CURDATE())',
      [req.tenantId, propertyId]
    );
    const [rows] = await db.query(`${APPLICATION_SELECT} WHERE ra.rental_application_id = ?`, [result.insertId]);
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    if (err.sqlState === '45000') {
      return res.status(409).json({ error: err.sqlMessage, code: 'BUSINESS_RULE' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tenant/leases
router.get('/leases', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.lease_id, l.start_date, l.end_date, l.monthly_rent, l.status, p.property_id, p.address
       FROM lease_agreement l
       JOIN property p ON p.property_id = l.property_id
       WHERE l.tenant_id = ?
       ORDER BY l.start_date DESC`,
      [req.tenantId]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tenant/payments
router.get('/payments', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT pm.payment_id, pm.lease_id, pm.amount, pm.payment_method, pm.status, pm.payment_date, p.address
       FROM payment pm
       JOIN lease_agreement l ON l.lease_id = pm.lease_id
       JOIN property p ON p.property_id = l.property_id
       WHERE pm.tenant_id = ?
       ORDER BY pm.payment_date DESC`,
      [req.tenantId]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;