const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/public/properties?search=...   (no login needed)
router.get('/properties', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
  const params = [];
  let sql = `SELECT property_id, address, property_type, bedrooms, bathrooms, monthly_rent
             FROM property WHERE status = 'Available'`;
  if (search) {
    sql += ' AND (address LIKE ? OR property_type LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY create_date DESC LIMIT 50';

  try {
    const [rows] = await db.query(sql, params);
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/public/enquiries { propertyId, name, email, message }  (no login needed)
router.post('/enquiries', async (req, res) => {
  const body = req.body || {};
  const propertyId = Number(body.propertyId);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!Number.isInteger(propertyId) || propertyId <= 0) return res.status(400).json({ error: 'Invalid property id' });
  if (!name || name.length > 100) return res.status(400).json({ error: 'Enter your name' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) return res.status(400).json({ error: 'Enter a valid email address' });
  if (message.length < 5 || message.length > 2000) return res.status(400).json({ error: 'Write a short message (5 to 2000 characters)' });

  try {
    const [result] = await db.query(
      'INSERT INTO property_enquiry (property_id, enquirer_name, enquirer_email, message) VALUES (?, ?, ?, ?)',
      [propertyId, name, email, message]
    );
    res.status(201).json({ data: { enquiry_id: result.insertId, status: 'New' } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
