const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/users', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT user_id, username, role, is_verified, is_active, created_at
         FROM user_account
        ORDER BY created_at DESC`
    );
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/properties', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT property_id, address, property_type, monthly_rent, status, create_date
         FROM property
        ORDER BY create_date DESC`
    );
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/payments', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.payment_id, p.amount, p.payment_method, p.status, p.payment_date,
              pr.address
         FROM payment p
         JOIN lease_agreement l ON l.lease_id    = p.lease_id
         JOIN property pr       ON pr.property_id = l.property_id
        ORDER BY p.payment_date DESC`
    );
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;