// backend/middleware/admin.js
// USE AFTER requireAuth. Lets only a signed-in, still-active Admin account through.
// The database is checked on every request, so deactivating the account takes effect at once
// even if someone still holds an old login cookie.
const db = require('../db');

async function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  try {
    const [rows] = await db.query(
      "SELECT user_id FROM user_account WHERE user_id = ? AND role = 'Admin' AND is_active = TRUE",
      [req.user.userId]
    );
    if (!rows[0]) {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    req.adminId = rows[0].user_id;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { requireAdmin };