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

module.exports = router;