
const express = require('express');
const db = require('../db');
const { requireAuth, requireTenant } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireTenant);

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /api/tenant/applications   body: { propertyId }
router.post('/applications', async (req, res) => {
  const propertyId = parseId((req.body || {}).propertyId);
  if (!propertyId) {
    return res.status(400).json({ error: 'A valid propertyId is required', code: 'INVALID_PROPERTY' });
  }

  try {
    const [props] = await db.query(
      "SELECT property_id FROM property WHERE property_id = ? AND status = 'Available'",
      [propertyId]
    );
    if (!props[0]) {
      return res.status(404).json({ error: 'Property is not available', code: 'NOT_AVAILABLE' });
    }

    const [[dup]] = await db.query(
      `SELECT COUNT(*) AS n FROM rental_application
       WHERE tenant_id = ? AND property_id = ? AND status IN ('Pending', 'Approved')`,
      [req.tenantId, propertyId]
    );
    if (dup.n > 0) {
      return res.status(409).json({ error: 'You already have an application for this property', code: 'ALREADY_APPLIED' });
    }

    const [result] = await db.query(
      `INSERT INTO rental_application (tenant_id, property_id, application_date, status)
       VALUES (?, ?, CURDATE(), 'Pending')`,
      [req.tenantId, propertyId]
    );
    res.status(201).json({ data: { rental_application_id: result.insertId, status: 'Pending' } });
  } catch (err) {
    if (err.sqlState === '45000') {
      return res.status(409).json({ error: err.sqlMessage, code: 'BUSINESS_RULE' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tenant/applications
router.get('/applications', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ra.rental_application_id, ra.application_date, ra.status,
              p.property_id, p.address, p.property_type, p.bedrooms, p.bathrooms, p.monthly_rent
       FROM rental_application ra
       JOIN property p ON p.property_id = ra.property_id
       WHERE ra.tenant_id = ?
       ORDER BY ra.application_date DESC, ra.rental_application_id DESC`,
      [req.tenantId]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tenant/leases
router.get('/leases', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.lease_id, l.status, l.monthly_rent,
              DATE_FORMAT(l.start_date, '%Y-%m-%d') AS start_date,
              DATE_FORMAT(l.end_date, '%Y-%m-%d') AS end_date,
              p.property_id, p.address
       FROM lease_agreement l
       JOIN property p ON p.property_id = l.property_id
       WHERE l.tenant_id = ?
       ORDER BY l.lease_id DESC`,
      [req.tenantId]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tenant/payments  (the tenant's own payment history)
router.get('/payments', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT pm.payment_id, pm.lease_id, pm.amount, pm.payment_method, pm.status, pm.payment_date,
              p.property_id, p.address
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

// POST /api/tenant/payments   body: { leaseId, amount, paymentMethod, reference? }
// Creates a PENDING payment. The owner confirms it, then it counts as income.
// [Guessing] these values must match what your payment_method column accepts.
const PAYMENT_METHODS = ['M-Pesa', 'Bank Transfer', 'Card', 'Cash'];
// Optional: if your payment table has a column for the gateway/confirmation code, set
// PAYMENT_REFERENCE_COLUMN=<that column name> in backend/.env and the code is saved there.
const REFERENCE_COLUMN = /^[a-z_]{1,64}$/.test(process.env.PAYMENT_REFERENCE_COLUMN || '')
  ? process.env.PAYMENT_REFERENCE_COLUMN
  : null;

router.post('/payments', async (req, res) => {
  const body = req.body || {};
  const leaseId = parseId(body.leaseId);
  const amount = Number(body.amount);
  const reference = typeof body.reference === 'string' ? body.reference.trim() : '';

  if (!leaseId) {
    return res.status(400).json({ error: 'Choose a lease', code: 'INVALID_LEASE' });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999) {
    return res.status(400).json({ error: 'Amount must be more than 0', code: 'INVALID_AMOUNT' });
  }
  if (!PAYMENT_METHODS.includes(body.paymentMethod)) {
    return res.status(400).json({ error: 'Choose a payment method', code: 'INVALID_METHOD' });
  }
  if (reference.length > 50) {
    return res.status(400).json({ error: 'Reference is too long', code: 'INVALID_REFERENCE' });
  }

  try {
    const [leases] = await db.query(
      "SELECT lease_id FROM lease_agreement WHERE lease_id = ? AND tenant_id = ? AND status = 'Active'",
      [leaseId, req.tenantId]
    );
    if (!leases[0]) {
      return res.status(404).json({ error: 'No active lease found', code: 'NO_ACTIVE_LEASE' });
    }

    let columns = 'lease_id, tenant_id, amount, payment_method, status, payment_date';
    let placeholders = "?, ?, ?, ?, 'Pending', NOW()";
    const params = [leaseId, req.tenantId, amount, body.paymentMethod];
    if (REFERENCE_COLUMN && reference) {
      columns += `, ${REFERENCE_COLUMN}`;
      placeholders += ', ?';
      params.push(reference);
    }

    const [result] = await db.query(`INSERT INTO payment (${columns}) VALUES (${placeholders})`, params);
    res.status(201).json({ data: { payment_id: result.insertId, status: 'Pending' } });
  } catch (err) {
    if (err.sqlState === '45000') {
      return res.status(409).json({ error: err.sqlMessage, code: 'BUSINESS_RULE' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;