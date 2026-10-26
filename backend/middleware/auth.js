const jwt = require('jsonwebtoken');
const db = require('../db');

function requireAuth(req, res, next) {
    const token = req.cookies.token;
    if(!token) return res.status(401).json({error: 'Not authenticated'});
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({error: 'Invalid or expired token'});
    }
}

// USE AFTER REQUIREAUTH. LOOKS UP THE OWNER ID FROM THE LOGGED-IN USER
async function requireOwner(req, res, next) {
    if (req.user.role != 'Owner') {
        return res.status(403).json({error: 'Access denied. Owner role required.'});

    }
    try {
        const [rows] = await db.query(
            'SELECT property_owner_id FROM property_owner WHERE user_id = ?',
            [req.user.userId]
        );

        if (!rows[0]) {
            return res.status(403).json({error: 'No  owner profile for this account.'})
        }
        req.ownerId = rows[0].property_owner_id;
        next();

    } catch(err) {
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
}

// USE AFTER REQUIREAUTH. LOOKS UP THE TENANT ID FROM THE LOGGED-IN USER
async function requireTenant(req, res, next) {
    if (req.user.role !== 'Tenant') {
        return res.status(403).json({error: 'Access denied. Tenant role required.'});
    }
    try {
        const [rows] = await db.query(
            'SELECT tenant_id FROM tenant WHERE user_id = ?',
            [req.user.userId]
        );

        if (!rows[0]) {
            return res.status(403).json({error: 'No tenant profile for this account.'});
        }
        req.tenantId = rows[0].tenant_id;
        next();

    } catch(err) {
        console.error(err);
        res.status(500).json({error: 'Server error'});
    }
}

module.exports = { requireAuth, requireOwner, requireTenant };
