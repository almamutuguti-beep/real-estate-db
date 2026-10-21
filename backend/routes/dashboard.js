const express = require('express');
const db = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireOwner);

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  const ownerId = req.ownerId;
  try {
    const [[props]] = await db.query(
      "SELECT COUNT(*) AS n FROM property WHERE property_owner_id = ? AND status <> 'Removed'",
      [ownerId]
    );

    const [[tenants]] = await db.query(
      `SELECT COUNT(DISTINCT l.tenant_id) AS n
       FROM lease_agreement l
       JOIN property p ON p.property_id = l.property_id
       WHERE p.property_owner_id = ? AND l.status = 'Active'`,
      [ownerId]
    );

    const [[apps]] = await db.query(
      `SELECT COUNT(*) AS n
       FROM rental_application ra
       JOIN property p ON p.property_id = ra.property_id
       WHERE p.property_owner_id = ? AND ra.status = 'Pending'`,
      [ownerId]
    );

    const [[income]] = await db.query(
      `SELECT COALESCE(SUM(pm.amount), 0) AS total
       FROM payment pm
       JOIN lease_agreement l ON l.lease_id = pm.lease_id
       JOIN property p ON p.property_id = l.property_id
       WHERE p.property_owner_id = ?
         AND pm.status = 'Complete'
         AND pm.payment_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
      [ownerId]
    );

    const [seriesRows] = await db.query(
      `SELECT DATE_FORMAT(pm.payment_date, '%Y-%m') AS ym, SUM(pm.amount) AS amount
       FROM payment pm
       JOIN lease_agreement l ON l.lease_id = pm.lease_id
       JOIN property p ON p.property_id = l.property_id
       WHERE p.property_owner_id = ?
         AND pm.status = 'Complete'
         AND pm.payment_date >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)
       GROUP BY ym`,
      [ownerId]
    );

    // Build the last 6 months so months with no payments show 0
    const byMonth = new Map(seriesRows.map((r) => [r.ym, Number(r.amount)]));
    const now = new Date();
    const incomeSeries = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      incomeSeries.push({
        month: d.toLocaleString('en-US', { month: 'short' }),
        amount: byMonth.get(key) || 0,
      });
    }

    res.json({
      totalProperties: props.n,
      monthlyIncome: Number(income.total),
      activeTenants: tenants.n,
      openApplications: apps.n,
      incomeSeries,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', debug: err.message });
  }
});

module.exports = router;