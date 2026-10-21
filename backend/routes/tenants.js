const express = require('express');
const db = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireOwner);

// GET /api/tenants  (tenants on this owner's active leases)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.tenant_id, t.full_name, t.phone, t.email,
              l.lease_id, l.start_date, l.end_date, l.monthly_rent, l.status AS lease_status,
              p.property_id, p.address
       FROM lease_agreement l
       JOIN property p ON p.property_id = l.property_id
       JOIN tenant t ON t.tenant_id = l.tenant_id
       WHERE p.property_owner_id = ? AND l.status = 'Active'
       ORDER BY t.full_name, l.lease_id`,
      [req.ownerId]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tenants/:tenantId
router.get('/:tenantId', async (req, res) => {
  const id = Number(req.params.tenantId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid tenant id' });
  }

  try {
    const [leases] = await db.query(
      `SELECT t.tenant_id, t.full_name, t.phone, t.email,
              l.lease_id, l.start_date, l.end_date, l.monthly_rent, l.status AS lease_status,
              p.property_id, p.address
       FROM lease_agreement l
       JOIN property p ON p.property_id = l.property_id
       JOIN tenant t ON t.tenant_id = l.tenant_id
       WHERE p.property_owner_id = ? AND l.tenant_id = ? AND l.status = 'Active'
       ORDER BY l.lease_id`,
      [req.ownerId, id]
    );
    if (!leases[0]) return res.status(404).json({ error: 'Tenant not found' });

    const [payments] = await db.query(
      `SELECT pm.payment_id, pm.lease_id, pm.amount, pm.payment_method, pm.status, pm.payment_date
       FROM payment pm
       JOIN lease_agreement l ON l.lease_id = pm.lease_id
       JOIN property p ON p.property_id = l.property_id
       WHERE p.property_owner_id = ? AND pm.tenant_id = ?
       ORDER BY pm.payment_date DESC`,
      [req.ownerId, id]
    );

    const first = leases[0];
    res.json({
      data: {
        tenant_id: first.tenant_id,
        full_name: first.full_name,
        phone: first.phone,
        email: first.email,
        leases: leases.map((l) => ({
          lease_id: l.lease_id,
          property_id: l.property_id,
          address: l.address,
          start_date: l.start_date,
          end_date: l.end_date,
          monthly_rent: l.monthly_rent,
          status: l.lease_status,
        })),
        payments,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;