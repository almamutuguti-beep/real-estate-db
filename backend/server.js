require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/tenants', require('./routes/tenants'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/applications', require('./routes/applications'));


app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 AS ok');
        res.json({ok : true, db: rows[0].ok });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database unreachable'});
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`))

