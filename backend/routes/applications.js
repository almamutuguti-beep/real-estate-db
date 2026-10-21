const express = require('express');
const db = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireOwner);

const VALID_STATUS = ['Pending', 'Approved', 'Rejected'];

const BASE_SELECT = `
  SELECT ra.rental_application_id, ra.application_date, ra.status,
         p.property_id, p.address, p.property_type, p.bedrooms, p.bathrooms, p.monthly_rent,
         t.tenant_id, t.full_name AS tenant_name, t.phone AS tenant_phone, t.email AS tenant_email
  FROM rental_application ra
  JOIN property p ON p.property_id = ra.property_id
  JOIN tenant t ON t.tenant_id = ra.tenant_id`;

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/applications?status=Pending
router.get('/', async (req, res) => {
  const { status } = req.query;
  const params = [req.ownerId];
  let sql = `${BASE_SELECT} WHERE p.property_owner_id = ?`;

  if (status !== undefined) {
    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: 'Invalid status', code: 'INVALID_STATUS' });
    }
    sql += ' AND ra.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY ra.application_date DESC, ra.rental_application_id DESC';

  try {
    const [rows] = await db.query(sql, params);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/applications/:applicationId
router.get('/:applicationId', async (req, res) => {
  const id = parseId(req.params.applicationId);
  if (!id) return res.status(400).json({ error: 'Invalid application id' });

  try {
    const [rows] = await db.query(
      `${BASE_SELECT} WHERE ra.rental_application_id = ? AND p.property_owner_id = ?`,
      [id, req.ownerId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Application not found' });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/applications/:applicationId   body: { "status": "Approved" }
router.patch('/:applicationId', async (req, res) => {
  const id = parseId(req.params.applicationId);
  if (!id) return res.status(400).json({ error: 'Invalid application id' });

  const status = (req.body || {}).status;
  if (!VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: 'status must be Pending, Approved or Rejected', code: 'INVALID_STATUS' });
  }

  try {
    const [owned] = await db.query(
      `SELECT ra.rental_application_id
       FROM rental_application ra
       JOIN property p ON p.property_id = ra.property_id
       WHERE ra.rental_application_id = ? AND p.property_owner_id = ?`,
      [id, req.ownerId]
    );
    if (!owned[0]) return res.status(404).json({ error: 'Application not found' });

    const [[lease]] = await db.query(
      'SELECT COUNT(*) AS n FROM lease_agreement WHERE rental_application_id = ?',
      [id]
    );
    if (lease.n > 0) {
      return res.status(409).json({
        error: 'This application already has a lease, so its status cannot change',
        code: 'APPLICATION_HAS_LEASE',
      });
    }

    await db.query(
      'UPDATE rental_application SET status = ? WHERE rental_application_id = ?',
      [status, id]
    );

    const [rows] = await db.query(
      `${BASE_SELECT} WHERE ra.rental_application_id = ? AND p.property_owner_id = ?`,
      [id, req.ownerId]
    );
    res.json({ data: rows[0] });
  } catch (err) {
    if (err.sqlState === '45000') {
      // A database rule (trigger or constraint) rejected the change
      return res.status(409).json({ error: err.sqlMessage, code: 'BUSINESS_RULE' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;