const express = require('express');
const db = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireOwner);

// GET /api/reports/owner
router.get('/owner', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.property_id, p.address, p.property_type, p.monthly_rent, p.status,
              (SELECT COUNT(*) FROM lease_agreement l
                WHERE l.property_id = p.property_id AND l.status = 'Active') AS active_leases,
              (SELECT COALESCE(SUM(pm.amount), 0)
                 FROM payment pm
                 JOIN lease_agreement l ON l.lease_id = pm.lease_id
                WHERE l.property_id = p.property_id AND pm.status = 'Complete') AS income_received
       FROM property p
       WHERE p.property_owner_id = ? AND p.status <> 'Removed'
       ORDER BY p.address`,
      [req.ownerId]
    );

    const [[tenants]] = await db.query(
      `SELECT COUNT(DISTINCT l.tenant_id) AS n
       FROM lease_agreement l
       JOIN property p ON p.property_id = l.property_id
       WHERE p.property_owner_id = ? AND l.status = 'Active'`,
      [req.ownerId]
    );

    const properties = rows.map((r) => ({
      property_id: r.property_id,
      address: r.address,
      property_type: r.property_type,
      monthly_rent: Number(r.monthly_rent),
      status: r.status,
      active_leases: Number(r.active_leases),
      income_received: Number(r.income_received),
    }));

    const total = properties.length;
    const rented = properties.filter((p) => p.status === 'Rented').length;
    const available = properties.filter((p) => p.status === 'Available').length;

    res.json({
      data: {
        summary: {
          totalProperties: total,
          availableProperties: available,
          rentedProperties: rented,
          occupancyRate: total ? Math.round((rented / total) * 1000) / 10 : 0,
          activeTenants: Number(tenants.n),
          totalIncomeReceived: properties.reduce((sum, p) => sum + p.income_received, 0),
        },
        properties,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;