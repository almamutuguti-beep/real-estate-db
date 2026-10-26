require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cookieParser = require('cookie-parser');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(cookieParser());

// Shared
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/register'));
app.use('/api/public', require('./routes/public'));
app.use('/api/settings', require('./routes/settings'));

// Property owner
app.use('/api/properties', require('./routes/properties'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/tenants', require('./routes/tenants'));
app.use('/api/leases', require('./routes/leases'));
app.use('/api/reports', require('./routes/reports'));

// Tenant, agent, maintenance worker, admin
app.use('/api/tenant', require('./routes/tenant'));
app.use('/api/agent', require('./routes/agent'));
app.use('/api/worker', require('./routes/worker'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 AS ok');
    res.json({ ok: true, db: rows[0].ok });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database unreachable' });
  }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
