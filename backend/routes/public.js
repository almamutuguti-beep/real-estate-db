
const router = require('express').Router();
const db = require('../db');

// GET /api/public/properties?search=
router.get('/properties', async (req, res) => {
  try {
    const search = `%${req.query.search || ''}%`;
    const [rows] = await db.query(
      `SELECT property_id, address, property_type, bedrooms, bathrooms, monthly_rent
       FROM property
       WHERE status = 'Available'
         AND (address LIKE ? OR property_type LIKE ?)
       ORDER BY create_date DESC`,
      [search, search]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load properties' });
  }
});

module.exports = router;