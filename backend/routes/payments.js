const express = require('express');
const db = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireOwner);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(s) {
  return DATE_RE.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());
}

// GET /api/payments?from=2026-01-01&to=2026-12-31
router.get('/', async (req, res) => {
  const { from, to } = req.query;
  if (from !== undefined && !validDate(from)) {
    return res.status(400).json({ error: 'from must be a date like 2026-01-01', code: 'INVALID_DATE' });
  }
  if (to !== undefined && !validDate(to)) {
    return res.status(400).json({ error: 'to must be a date like 2026-12-31', code: 'INVALID_DATE' });
  }

  const params = [req.ownerId];
  let sql = `SELECT pm.payment_id, pm.lease_id, p.property_id, p.address,
                    t.full_name AS tenant_name, pm.amount, pm.payment_method, pm.payment_date
             FROM payment pm
             JOIN lease_agreement l ON l.lease_id = pm.lease_id
             JOIN property p ON p.property_id = l.property_id
             JOIN tenant t ON t.tenant_id = pm.tenant_id
             WHERE p.property_owner_id = ? AND pm.status = 'Complete'`;
  if (from) {
    sql += ' AND pm.payment_date >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND pm.payment_date < DATE_ADD(?, INTERVAL 1 DAY)';
    params.push(to);
  }
  sql += ' ORDER BY pm.payment_date DESC';

  try {
    const [rows] = await db.query(sql, params);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/payments/summary
router.get('/summary', async (req, res) => {
  try {
    const [[totals]] = await db.query(
      `SELECT COALESCE(SUM(pm.amount), 0) AS total,
              COUNT(*) AS n,
              COALESCE(SUM(CASE WHEN pm.payment_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
                                THEN pm.amount ELSE 0 END), 0) AS this_month
       FROM payment pm
       JOIN lease_agreement l ON l.lease_id = pm.lease_id
       JOIN property p ON p.property_id = l.property_id
       WHERE p.property_owner_id = ? AND pm.status = 'Complete'`,
      [req.ownerId]
    );

    const [seriesRows] = await db.query(
      `SELECT DATE_FORMAT(pm.payment_date, '%Y-%m') AS ym, SUM(pm.amount) AS amount
       FROM payment pm
       JOIN lease_agreement l ON l.lease_id = pm.lease_id
       JOIN property p ON p.property_id = l.property_id
       WHERE p.property_owner_id = ?
         AND pm.status = 'Complete'
         AND pm.payment_date >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 11 MONTH)
       GROUP BY ym`,
      [req.ownerId]
    );

    const byMonth = new Map(seriesRows.map((r) => [r.ym, Number(r.amount)]));
    const now = new Date();
    const incomeSeries = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      incomeSeries.push({
        month: d.toLocaleString('en-US', { month: 'short' }),
        amount: byMonth.get(key) || 0,
      });
    }

    res.json({
      totalReceived: Number(totals.total),
      thisMonth: Number(totals.this_month),
      paymentCount: totals.n,
      incomeSeries,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/payments/pending  -> payments tenants have submitted and the owner has not confirmed
router.get('/pending', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT pm.payment_id, pm.lease_id, p.property_id, p.address,
              t.full_name AS tenant_name, pm.amount, pm.payment_method, pm.payment_date
       FROM payment pm
       JOIN lease_agreement l ON l.lease_id = pm.lease_id
       JOIN property p ON p.property_id = l.property_id
       JOIN tenant t ON t.tenant_id = pm.tenant_id
       WHERE p.property_owner_id = ? AND pm.status = 'Pending'
       ORDER BY pm.payment_date DESC`,
      [req.ownerId]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/payments/:paymentId   body: { status: 'Complete' | 'Failed' }
// [Guessing] 'Failed' is a valid payment.status value in your schema.
router.patch('/:paymentId', async (req, res) => {
  const id = Number(req.params.paymentId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid payment id' });
  }
  const status = (req.body || {}).status;
  if (!['Complete', 'Failed'].includes(status)) {
    return res.status(400).json({ error: 'status must be Complete or Failed', code: 'INVALID_STATUS' });
  }

  try {
    const [owned] = await db.query(
      `SELECT pm.payment_id, pm.status
       FROM payment pm
       JOIN lease_agreement l ON l.lease_id = pm.lease_id
       JOIN property p ON p.property_id = l.property_id
       WHERE pm.payment_id = ? AND p.property_owner_id = ?`,
      [id, req.ownerId]
    );
    if (!owned[0]) return res.status(404).json({ error: 'Payment not found' });
    if (owned[0].status !== 'Pending') {
      return res.status(409).json({ error: 'Only a pending payment can be changed', code: 'NOT_PENDING' });
    }

    await db.query("UPDATE payment SET status = ? WHERE payment_id = ? AND status = 'Pending'", [status, id]);
    res.json({ data: { payment_id: id, status } });
  } catch (err) {
    if (err.sqlState === '45000') {
      // e.g. a database rule requiring a gateway confirmation before a payment can be Complete
      return res.status(409).json({ error: err.sqlMessage, code: 'BUSINESS_RULE' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;