const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin, handle, positiveId } = require('../middleware/auth');

// System administrator: platform-wide overview, user management,
// payments ledger and maintenance dispatch.
const router = express.Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/summary
router.get('/summary', handle(async (req, res) => {
  const [roles] = await db.query('SELECT role, COUNT(*) AS n FROM user_account WHERE is_active = TRUE GROUP BY role');
  const [[props]] = await db.query(
    "SELECT COUNT(*) AS total, SUM(status = 'Rented') AS rented FROM property WHERE status <> 'Removed'"
  );
  const [[revenue]] = await db.query(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM payment WHERE status = 'Complete' AND payment_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')"
  );
  const [[unverified]] = await db.query('SELECT COUNT(*) AS n FROM user_account WHERE is_verified = FALSE AND is_active = TRUE');
  const [[pendingPayments]] = await db.query("SELECT COUNT(*) AS n FROM payment WHERE status = 'Pending'");
  const [[openJobs]] = await db.query("SELECT COUNT(*) AS n FROM maintenance_request WHERE status <> 'Complete'");
  const [seriesRows] = await db.query(
    `SELECT DATE_FORMAT(payment_date, '%Y-%m') AS ym, SUM(amount) AS amount
     FROM payment WHERE status = 'Complete'
       AND payment_date >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)
     GROUP BY ym`
  );

  const byMonth = new Map(seriesRows.map((r) => [r.ym, Number(r.amount)]));
  const now = new Date();
  const revenueSeries = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    revenueSeries.push({ month: d.toLocaleString('en-US', { month: 'short' }), amount: byMonth.get(key) || 0 });
  }

  const total = Number(props.total) || 0;
  res.json({
    usersByRole: Object.fromEntries(roles.map((r) => [r.role, r.n])),
    totalProperties: total,
    occupancyRate: total ? Math.round((Number(props.rented) / total) * 100) : 0,
    monthlyRevenue: Number(revenue.total),
    unverifiedUsers: unverified.n,
    pendingPayments: pendingPayments.n,
    openMaintenance: openJobs.n,
    revenueSeries,
  });
}));

// GET /api/admin/users?role=Tenant&search=jane
router.get('/users', handle(async (req, res) => {
  const params = [];
  let sql = `SELECT u.user_id, u.username, u.role, u.is_verified, u.is_active, u.created_at,
                    COALESCE(t.full_name, a.full_name, w.full_name, o.company_name) AS display_name,
                    COALESCE(t.email, a.email, o.email) AS email
             FROM user_account u
             LEFT JOIN tenant t ON t.user_id = u.user_id
             LEFT JOIN agent a ON a.user_id = u.user_id
             LEFT JOIN maintenance_worker w ON w.user_id = u.user_id
             LEFT JOIN property_owner o ON o.user_id = u.user_id
             WHERE 1 = 1`;
  if (['Admin', 'Owner', 'Tenant', 'Agent', 'Worker'].includes(req.query.role)) {
    sql += ' AND u.role = ?';
    params.push(req.query.role);
  }
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 50) : '';
  if (search) {
    sql += ' AND u.username LIKE ?';
    params.push(`%${search}%`);
  }
  sql += ' ORDER BY u.created_at DESC LIMIT 200';
  const [rows] = await db.query(sql, params);
  res.json({ data: rows });
}));

// PATCH /api/admin/users/:id { action: 'verify' | 'deactivate' | 'activate' }
router.patch('/users/:id', handle(async (req, res) => {
  const id = positiveId(req.params.id);
  const action = (req.body || {}).action;
  if (!id) return res.status(400).json({ error: 'Invalid user id' });
  if (id === req.user.userId && action === 'deactivate') return res.status(400).json({ error: 'You cannot deactivate your own account' });

  if (action === 'verify') await db.query('UPDATE user_account SET is_verified = TRUE WHERE user_id = ?', [id]);
  else if (action === 'deactivate') await db.query('CALL sp_deactivate_user(?, ?)', [req.user.userId, id]);
  else if (action === 'activate') await db.query('UPDATE user_account SET is_active = TRUE WHERE user_id = ?', [id]);
  else return res.status(400).json({ error: 'Unknown action' });

  res.json({ data: { user_id: id, action } });
}));

// GET /api/admin/properties
router.get('/properties', handle(async (req, res) => {
  const [rows] = await db.query(
    `SELECT p.property_id, p.address, p.property_type, p.monthly_rent, p.status,
            COALESCE(o.company_name, u.username) AS owner_name
     FROM property p
     JOIN property_owner o ON o.property_owner_id = p.property_owner_id
     JOIN user_account u ON u.user_id = o.user_id
     WHERE p.status <> 'Removed' ORDER BY p.create_date DESC LIMIT 200`
  );
  res.json({ data: rows });
}));

// GET /api/admin/payments
router.get('/payments', handle(async (req, res) => {
  const [rows] = await db.query(
    `SELECT pm.payment_id, pm.amount, pm.payment_method, pm.status, pm.confirmation_status,
            pm.gateway_confirmation_id, pm.payment_date, t.full_name AS tenant_name, p.address
     FROM payment pm
     JOIN tenant t ON t.tenant_id = pm.tenant_id
     JOIN lease_agreement l ON l.lease_id = pm.lease_id
     JOIN property p ON p.property_id = l.property_id
     ORDER BY pm.payment_date DESC LIMIT 200`
  );
  res.json({ data: rows });
}));

// PATCH /api/admin/payments/:id { action: 'confirm' | 'fail', reference }
router.patch('/payments/:id', handle(async (req, res) => {
  const id = positiveId(req.params.id);
  const { action, reference } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Invalid payment id' });
  if (action === 'confirm') {
    const ref = typeof reference === 'string' && reference.trim() ? reference.trim().slice(0, 50) : `ADM-${Date.now()}`;
    await db.query('CALL sp_confirm_payment(?, ?)', [id, ref]);
  } else if (action === 'fail') {
    await db.query('CALL sp_fail_payment(?)', [id]);
  } else {
    return res.status(400).json({ error: 'Unknown action' });
  }
  res.json({ data: { payment_id: id, action } });
}));

// GET /api/admin/maintenance
router.get('/maintenance', handle(async (req, res) => {
  const [rows] = await db.query(
    `SELECT mr.request_id, mr.description, mr.status, mr.created_at, mr.assigned_to,
            p.address, t.full_name AS tenant_name, w.full_name AS worker_name
     FROM maintenance_request mr
     JOIN property p ON p.property_id = mr.property_id
     JOIN tenant t ON t.tenant_id = mr.tenant_id
     LEFT JOIN maintenance_worker w ON w.worker_id = mr.assigned_to
     ORDER BY FIELD(mr.status, 'Open', 'Assigned', 'In Progress', 'Complete'), mr.created_at DESC LIMIT 200`
  );
  res.json({ data: rows });
}));

// GET /api/admin/workers
router.get('/workers', handle(async (req, res) => {
  const [rows] = await db.query('SELECT worker_id, full_name, specialty FROM maintenance_worker ORDER BY full_name');
  res.json({ data: rows });
}));

// PATCH /api/admin/maintenance/:id { workerId }
router.patch('/maintenance/:id', handle(async (req, res) => {
  const id = positiveId(req.params.id);
  const workerId = positiveId((req.body || {}).workerId);
  if (!id || !workerId) return res.status(400).json({ error: 'Invalid request or worker id' });
  const [result] = await db.query(
    "UPDATE maintenance_request SET assigned_to = ?, status = 'Assigned' WHERE request_id = ? AND status IN ('Open','Assigned')",
    [workerId, id]
  );
  if (!result.affectedRows) return res.status(400).json({ error: 'Only open requests can be assigned' });
  res.json({ data: { request_id: id, status: 'Assigned' } });
}));

module.exports = router;
