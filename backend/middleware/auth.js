const jwt = require('jsonwebtoken');
const db = require('../db');

function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Builds a middleware that checks the role and loads the role's profile id
// onto the request (e.g. req.ownerId, req.tenantId).
function roleGuard(role, lookup) {
  return async function guard(req, res, next) {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Access denied. ${role} role required.` });
    }
    if (!lookup) return next();
    try {
      const [rows] = await db.query(lookup.sql, [req.user.userId]);
      if (!rows[0]) {
        return res.status(403).json({ error: `No ${role.toLowerCase()} profile for this account.` });
      }
      req[lookup.key] = rows[0].id;
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  };
}

const requireOwner = roleGuard('Owner', {
  key: 'ownerId',
  sql: 'SELECT property_owner_id AS id FROM property_owner WHERE user_id = ?',
});

const requireTenant = roleGuard('Tenant', {
  key: 'tenantId',
  sql: 'SELECT tenant_id AS id FROM tenant WHERE user_id = ?',
});

const requireAgent = roleGuard('Agent', {
  key: 'agentId',
  sql: 'SELECT agent_id AS id FROM agent WHERE user_id = ?',
});

const requireWorker = roleGuard('Worker', {
  key: 'workerId',
  sql: 'SELECT worker_id AS id FROM maintenance_worker WHERE user_id = ?',
});

const requireAdmin = roleGuard('Admin');

// Wraps an async route so thrown errors become a JSON 500 (or 400 for
// SIGNAL SQLSTATE '45000' errors raised by the group's stored procedures).
function handle(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err && err.sqlState === '45000') {
        return res.status(400).json({ error: err.sqlMessage || 'Request rejected by the database' });
      }
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  };
}

function positiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

module.exports = {
  requireAuth,
  requireOwner,
  requireTenant,
  requireAgent,
  requireWorker,
  requireAdmin,
  handle,
  positiveId,
};
