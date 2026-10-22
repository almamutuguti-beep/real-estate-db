const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\s-]{7,15}$/;

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function getAccount(userId) {
  const [rows] = await db.query(
    'SELECT user_id, username, role, is_active FROM user_account WHERE user_id = ?',
    [userId]
  );
  return rows[0] && rows[0].is_active ? rows[0] : null;
}

async function getProfile(account) {
  if (account.role === 'Owner') {
    const [rows] = await db.query(
      'SELECT company_name, phone, email FROM property_owner WHERE user_id = ?',
      [account.user_id]
    );
    const row = rows[0];
    return row ? { companyName: row.company_name, phone: row.phone, email: row.email } : {};
  }
  if (account.role === 'Tenant') {
    const [rows] = await db.query(
      'SELECT full_name, phone, email FROM tenant WHERE user_id = ?',
      [account.user_id]
    );
    const row = rows[0];
    return row ? { fullName: row.full_name, phone: row.phone, email: row.email } : {};
  }
  return {};
}

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const account = await getAccount(req.user.userId);
    if (!account) return res.status(401).json({ error: 'Not authenticated' });
    res.json({
      data: { username: account.username, role: account.role, profile: await getProfile(account) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/settings/profile
router.patch('/profile', async (req, res) => {
  const body = req.body || {};
  try {
    const account = await getAccount(req.user.userId);
    if (!account) return res.status(401).json({ error: 'Not authenticated' });
    if (account.role !== 'Owner' && account.role !== 'Tenant') {
      return res.status(403).json({ error: 'Profile settings are available for owners and tenants' });
    }

    const sets = [];
    const params = [];

    if ('phone' in body) {
      const phone = text(body.phone);
      if (!PHONE_RE.test(phone)) {
        return res.status(400).json({ error: 'Enter a valid phone number (7 to 15 digits)', code: 'INVALID_PHONE' });
      }
      sets.push('phone = ?');
      params.push(phone);
    }
    if ('email' in body) {
      const email = text(body.email);
      if (!EMAIL_RE.test(email) || email.length > 100) {
        return res.status(400).json({ error: 'Enter a valid email address', code: 'INVALID_EMAIL' });
      }
      sets.push('email = ?');
      params.push(email);
    }
    if (account.role === 'Owner' && 'companyName' in body) {
      const company = text(body.companyName);
      if (company.length > 100) {
        return res.status(400).json({ error: 'Company name is too long', code: 'INVALID_COMPANY' });
      }
      sets.push('company_name = ?');
      params.push(company || null);
    }
    if (account.role === 'Tenant' && 'fullName' in body) {
      const name = text(body.fullName);
      if (!name || name.length > 100) {
        return res.status(400).json({ error: 'Enter your full name', code: 'INVALID_NAME' });
      }
      sets.push('full_name = ?');
      params.push(name);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const table = account.role === 'Owner' ? 'property_owner' : 'tenant';
    await db.query(`UPDATE ${table} SET ${sets.join(', ')} WHERE user_id = ?`, [...params, account.user_id]);

    res.json({ data: { username: account.username, role: account.role, profile: await getProfile(account) } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'That email is already registered', code: 'EMAIL_TAKEN' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/settings/password
router.post('/password', async (req, res) => {
  const body = req.body || {};
  const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const next = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (next.length < 8 || Buffer.byteLength(next) > 72) {
    return res.status(400).json({ error: 'New password must be at least 8 characters', code: 'INVALID_PASSWORD' });
  }
  if (next === current) {
    return res.status(400).json({ error: 'New password must be different from the current one', code: 'SAME_PASSWORD' });
  }

  try {
    const [rows] = await db.query(
      'SELECT password_hash FROM user_account WHERE user_id = ? AND is_active = TRUE',
      [req.user.userId]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Not authenticated' });

    const matches = await bcrypt.compare(current, rows[0].password_hash);
    if (!matches) {
      return res.status(400).json({ error: 'Current password is incorrect', code: 'WRONG_PASSWORD' });
    }

    const hash = await bcrypt.hash(next, 10);
    await db.query('UPDATE user_account SET password_hash = ? WHERE user_id = ?', [hash, req.user.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;