const express = require('express');
const db = require('../db');
const { requireAuth, requireOwner } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireOwner);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  return typeof value === 'string' && DATE_RE.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const LEASE_SELECT = `SELECT l.lease_id, l.rental_application_id,
       DATE_FORMAT(l.start_date, '%Y-%m-%d') AS start_date,
       DATE_FORMAT(l.end_date, '%Y-%m-%d') AS end_date,
       DATE_FORMAT(l.signed_date, '%Y-%m-%d') AS signed_date,
       l.monthly_rent, l.status,
       p.property_id, p.address,
       t.tenant_id, t.full_name AS tenant_name, t.phone AS tenant_phone
FROM lease_agreement l
JOIN property p ON p.property_id = l.property_id
JOIN tenant t ON t.tenant_id = l.tenant_id`;

// GET /api/leases
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `${LEASE_SELECT} WHERE p.property_owner_id = ? ORDER BY l.created_at DESC, l.lease_id DESC`,
      [req.ownerId]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/leases   body: { applicationId, startDate, endDate, monthlyRent? }
router.post('/', async (req, res) => {
  const body = req.body || {};
  const applicationId = parseId(body.applicationId);
  if (!applicationId) {
    return res.status(400).json({ error: 'A valid applicationId is required', code: 'INVALID_APPLICATION' });
  }
  if (!validDate(body.startDate) || !validDate(body.endDate)) {
    return res.status(400).json({ error: 'Start and end dates must look like 2026-11-01', code: 'INVALID_DATE' });
  }
  if (body.endDate <= body.startDate) {
    return res.status(400).json({ error: 'The end date must be after the start date', code: 'INVALID_DATE_RANGE' });
  }

  try {
    const [apps] = await db.query(
      `SELECT ra.rental_application_id, ra.tenant_id, ra.property_id, ra.status, p.monthly_rent
       FROM rental_application ra
       JOIN property p ON p.property_id = ra.property_id
       WHERE ra.rental_application_id = ? AND p.property_owner_id = ?`,
      [applicationId, req.ownerId]
    );
    const application = apps[0];
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.status !== 'Approved') {
      return res.status(409).json({ error: 'Approve the application before creating a lease', code: 'APPLICATION_NOT_APPROVED' });
    }

    const [[existing]] = await db.query(
      'SELECT COUNT(*) AS n FROM lease_agreement WHERE rental_application_id = ?',
      [applicationId]
    );
    if (existing.n > 0) {
      return res.status(409).json({ error: 'This application already has a lease', code: 'LEASE_EXISTS' });
    }

    let rent = Number(application.monthly_rent);
    if (body.monthlyRent !== undefined && body.monthlyRent !== null && body.monthlyRent !== '') {
      rent = Number(body.monthlyRent);
    }
    if (!Number.isFinite(rent) || rent <= 0) {
      return res.status(400).json({ error: 'monthlyRent must be a positive number', code: 'INVALID_RENT' });
    }

    const [result] = await db.query(
      `INSERT INTO lease_agreement
         (rental_application_id, tenant_id, property_id, start_date, end_date, monthly_rent, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Draft')`,
      [applicationId, application.tenant_id, application.property_id, body.startDate, body.endDate, rent]
    );
    const [rows] = await db.query(`${LEASE_SELECT} WHERE l.lease_id = ?`, [result.insertId]);
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    if (err.sqlState === '45000') {
      return res.status(409).json({ error: err.sqlMessage, code: 'BUSINESS_RULE' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/leases/:leaseId   body: { status: 'Active' | 'Ended' }
router.patch('/:leaseId', async (req, res) => {
  const id = parseId(req.params.leaseId);
  if (!id) return res.status(400).json({ error: 'Invalid lease id' });
  const status = (req.body || {}).status;
  if (!['Active', 'Ended'].includes(status)) {
    return res.status(400).json({ error: 'status must be Active or Ended', code: 'INVALID_STATUS' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT l.lease_id, l.status, l.property_id
       FROM lease_agreement l
       JOIN property p ON p.property_id = l.property_id
       WHERE l.lease_id = ? AND p.property_owner_id = ?
       FOR UPDATE`,
      [id, req.ownerId]
    );
    const lease = rows[0];
    if (!lease) {
      await conn.rollback();
      return res.status(404).json({ error: 'Lease not found' });
    }

    if (status === 'Active') {
      if (lease.status !== 'Draft' && lease.status !== 'Signed') {
        await conn.rollback();
        return res.status(409).json({ error: 'Only a draft lease can be activated', code: 'INVALID_TRANSITION' });
      }
      await conn.query(
        "UPDATE lease_agreement SET status = 'Active', signed_date = COALESCE(signed_date, CURDATE()) WHERE lease_id = ?",
        [id]
      );
      await conn.query(
        "UPDATE property SET status = 'Rented' WHERE property_id = ? AND status = 'Available'",
        [lease.property_id]
      );
    } else {
      if (lease.status !== 'Active' && lease.status !== 'Signed') {
        await conn.rollback();
        return res.status(409).json({ error: 'Only an active lease can be ended', code: 'INVALID_TRANSITION' });
      }
      await conn.query("UPDATE lease_agreement SET status = 'Ended' WHERE lease_id = ?", [id]);
      await conn.query(
        `UPDATE property SET status = 'Available'
         WHERE property_id = ? AND status = 'Rented'
           AND NOT EXISTS (SELECT 1 FROM lease_agreement WHERE property_id = ? AND status IN ('Signed', 'Active'))`,
        [lease.property_id, lease.property_id]
      );
    }
    await conn.commit();

    const [updated] = await db.query(`${LEASE_SELECT} WHERE l.lease_id = ?`, [id]);
    res.json({ data: updated[0] });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error(rollbackErr);
    }
    if (err.sqlState === '45000') {
      return res.status(409).json({ error: err.sqlMessage, code: 'BUSINESS_RULE' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

module.exports = router;