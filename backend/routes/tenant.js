const express = require('express');
const db = require('../db');
const { requireAuth, requireTenant, handle, positiveId } = require('../middleware/auth');

// Tenant-facing: the signed-in tenant's own applications, leases, payments,
// maintenance requests and viewings.
const router = express.Router();
router.use(requireAuth, requireTenant);

const PAYMENT_METHODS = ['M-Pesa', 'Card', 'Bank Transfer', 'Cash'];

// GET /api/tenant/summary
router.get('/summary', handle(async (req, res) => {
  const id = req.tenantId;
  const [[apps]] = await db.query("SELECT COUNT(*) AS n FROM rental_application WHERE tenant_id = ? AND status = 'Pending'", [id]);
  const [[lease]] = await db.query(
    `SELECT l.lease_id, l.monthly_rent, l.end_date, p.address
     FROM lease_agreement l JOIN property p ON p.property_id = l.property_id
     WHERE l.tenant_id = ? AND l.status = 'Active' ORDER BY l.start_date DESC LIMIT 1`,
    [id]
  );
  const [[paid]] = await db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM payment WHERE tenant_id = ? AND status = 'Complete'", [id]);
  const [[open]] = await db.query("SELECT COUNT(*) AS n FROM maintenance_request WHERE tenant_id = ? AND status <> 'Complete'", [id]);
  res.json({
    pendingApplications: apps.n,
    activeLease: lease || null,
    totalPaid: Number(paid.total),
    openRequests: open.n,
  });
}));

// GET /api/tenant/applications
router.get('/applications', handle(async (req, res) => {
  const [rows] = await db.query(
    `SELECT ra.rental_application_id, ra.application_date, ra.status,
            p.property_id, p.address, p.property_type, p.monthly_rent
     FROM rental_application ra JOIN property p ON p.property_id = ra.property_id
     WHERE ra.tenant_id = ? ORDER BY ra.application_date DESC, ra.rental_application_id DESC`,
    [req.tenantId]
  );
  res.json({ data: rows });
}));

// POST /api/tenant/applications { propertyId }
router.post('/applications', handle(async (req, res) => {
  const propertyId = positiveId((req.body || {}).propertyId);
  if (!propertyId) return res.status(400).json({ error: 'Invalid property id' });

  const [[property]] = await db.query("SELECT property_id FROM property WHERE property_id = ? AND status = 'Available'", [propertyId]);
  if (!property) return res.status(404).json({ error: 'That property is not available' });

  const [[existing]] = await db.query(
    "SELECT rental_application_id FROM rental_application WHERE tenant_id = ? AND property_id = ? AND status IN ('Pending','Approved')",
    [req.tenantId, propertyId]
  );
  if (existing) return res.status(409).json({ error: 'You have already applied for this property' });

  const [result] = await db.query(
    "INSERT INTO rental_application (tenant_id, property_id, application_date, status) VALUES (?, ?, CURDATE(), 'Pending')",
    [req.tenantId, propertyId]
  );
  res.status(201).json({ data: { rental_application_id: result.insertId, status: 'Pending' } });
}));

// GET /api/tenant/leases
router.get('/leases', handle(async (req, res) => {
  const [rows] = await db.query(
    `SELECT l.lease_id, l.start_date, l.end_date, l.monthly_rent, l.status, l.signed_date,
            p.property_id, p.address
     FROM lease_agreement l JOIN property p ON p.property_id = l.property_id
     WHERE l.tenant_id = ? ORDER BY l.start_date DESC`,
    [req.tenantId]
  );
  res.json({ data: rows });
}));

// GET /api/tenant/payments
router.get('/payments', handle(async (req, res) => {
  const [rows] = await db.query(
    `SELECT pm.payment_id, pm.lease_id, pm.amount, pm.payment_method, pm.status, pm.payment_date, p.address
     FROM payment pm
     JOIN lease_agreement l ON l.lease_id = pm.lease_id
     JOIN property p ON p.property_id = l.property_id
     WHERE pm.tenant_id = ? ORDER BY pm.payment_date DESC`,
    [req.tenantId]
  );
  res.json({ data: rows });
}));

// POST /api/tenant/payments { leaseId, amount, method }
router.post('/payments', handle(async (req, res) => {
  const body = req.body || {};
  const leaseId = positiveId(body.leaseId);
  const amount = Number(body.amount);
  if (!leaseId) return res.status(400).json({ error: 'Invalid lease id' });
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) return res.status(400).json({ error: 'Enter a valid amount' });
  if (!PAYMENT_METHODS.includes(body.method)) return res.status(400).json({ error: 'Choose a payment method' });

  const [[lease]] = await db.query("SELECT lease_id FROM lease_agreement WHERE lease_id = ? AND tenant_id = ? AND status = 'Active'", [leaseId, req.tenantId]);
  if (!lease) return res.status(404).json({ error: 'No active lease found' });

  const [result] = await db.query('CALL sp_process_payment(?, ?, ?, ?)', [leaseId, req.tenantId, amount, body.method]);
  res.status(201).json({ data: result[0][0] });
}));

// GET /api/tenant/maintenance
router.get('/maintenance', handle(async (req, res) => {
  const [rows] = await db.query(
    `SELECT mr.request_id, mr.description, mr.status, mr.created_at, mr.completed_at,
            p.address, w.full_name AS worker_name
     FROM maintenance_request mr
     JOIN property p ON p.property_id = mr.property_id
     LEFT JOIN maintenance_worker w ON w.worker_id = mr.assigned_to
     WHERE mr.tenant_id = ? ORDER BY mr.created_at DESC`,
    [req.tenantId]
  );
  res.json({ data: rows });
}));

// POST /api/tenant/maintenance { description }
router.post('/maintenance', handle(async (req, res) => {
  const description = typeof (req.body || {}).description === 'string' ? req.body.description.trim() : '';
  if (description.length < 5 || description.length > 500) {
    return res.status(400).json({ error: 'Describe the issue in 5 to 500 characters' });
  }
  const [[lease]] = await db.query(
    "SELECT property_id FROM lease_agreement WHERE tenant_id = ? AND status = 'Active' ORDER BY start_date DESC LIMIT 1",
    [req.tenantId]
  );
  if (!lease) return res.status(400).json({ error: 'You need an active lease to report an issue' });

  const [result] = await db.query(
    'INSERT INTO maintenance_request (property_id, tenant_id, description) VALUES (?, ?, ?)',
    [lease.property_id, req.tenantId, description]
  );
  res.status(201).json({ data: { request_id: result.insertId, status: 'Open' } });
}));

// GET /api/tenant/viewings
router.get('/viewings', handle(async (req, res) => {
  const [rows] = await db.query(
    `SELECT pv.property_viewing_id, pv.viewing_datetime, pv.status, p.address
     FROM property_viewing pv JOIN property p ON p.property_id = pv.property_id
     WHERE pv.tenant_id = ? ORDER BY pv.viewing_datetime DESC`,
    [req.tenantId]
  );
  res.json({ data: rows });
}));

// POST /api/tenant/viewings { propertyId, datetime }
router.post('/viewings', handle(async (req, res) => {
  const body = req.body || {};
  const propertyId = positiveId(body.propertyId);
  const when = new Date(body.datetime);
  if (!propertyId) return res.status(400).json({ error: 'Invalid property id' });
  if (Number.isNaN(when.getTime()) || when < new Date()) return res.status(400).json({ error: 'Pick a future date and time' });

  const [result] = await db.query(
    "INSERT INTO property_viewing (tenant_id, property_id, viewing_datetime, status) VALUES (?, ?, ?, 'Scheduled')",
    [req.tenantId, propertyId, when]
  );
  res.status(201).json({ data: { property_viewing_id: result.insertId, status: 'Scheduled' } });
}));

module.exports = router;
