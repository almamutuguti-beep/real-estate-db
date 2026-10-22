const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

const ALLOWED_ROLES = ['Owner', 'Tenant'];
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,50}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s-]{7,15}$/;

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const body = req.body || {};
  const username = text(body.username);
  const password = typeof body.password === 'string' ? body.password : '';
  const role = body.role;
  const email = text(body.email);
  const phone = text(body.phone);

  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 3 to 50 characters: letters, numbers, dot, dash or underscore', code: 'INVALID_USERNAME' });
  }
  if (password.length < 8 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ error: 'Password must be at least 8 characters', code: 'INVALID_PASSWORD' });
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Role must be Owner or Tenant', code: 'INVALID_ROLE' });
  }
  if (!EMAIL_RE.test(email) || email.length > 100) {
    return res.status(400).json({ error: 'Enter a valid email address', code: 'INVALID_EMAIL' });
  }
  if (!PHONE_RE.test(phone)) {
    return res.status(400).json({ error: 'Enter a valid phone number (7 to 15 digits)', code: 'INVALID_PHONE' });
  }

  let companyName = null;
  let fullName = '';
  let nationalId = '';
  if (role === 'Owner') {
    companyName = text(body.companyName) || null;
    if (companyName && companyName.length > 100) {
      return res.status(400).json({ error: 'Company name is too long', code: 'INVALID_COMPANY' });
    }
  } else {
    fullName = text(body.fullName);
    nationalId = text(body.nationalId);
    if (!fullName || fullName.length > 100) {
      return res.status(400).json({ error: 'Enter your full name', code: 'INVALID_NAME' });
    }
    if (nationalId.length < 4 || nationalId.length > 20) {
      return res.status(400).json({ error: 'Enter a valid ID number', code: 'INVALID_ID_NUMBER' });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [account] = await conn.query(
      'INSERT INTO user_account (username, password_hash, role, is_verified, is_active) VALUES (?, ?, ?, TRUE, TRUE)',
      [username, passwordHash, role]
    );
    const userId = account.insertId;

    if (role === 'Owner') {
      await conn.query(
        'INSERT INTO property_owner (user_id, company_name, phone, email) VALUES (?, ?, ?, ?)',
        [userId, companyName, phone, email]
      );
    } else {
      await conn.query(
        'INSERT INTO tenant (user_id, full_name, national_id, phone, email) VALUES (?, ?, ?, ?, ?)',
        [userId, fullName, nationalId, phone, email]
      );
    }
    await conn.commit();

    const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.status(201).json({ user: { userId, username, role, isVerified: true } });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error(rollbackErr);
    }
    if (err.code === 'ER_DUP_ENTRY') {
      const message = String(err.sqlMessage || '');
      if (message.includes('username')) {
        return res.status(409).json({ error: 'That username is already taken', code: 'USERNAME_TAKEN' });
      }
      if (message.includes('national_id')) {
        return res.status(409).json({ error: 'That ID number is already registered', code: 'ID_NUMBER_TAKEN' });
      }
      return res.status(409).json({ error: 'That email is already registered', code: 'EMAIL_TAKEN' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

module.exports = router;