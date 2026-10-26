const express = require('express');
const db = require('../db');
const { requireAuth, requireAgent, handle, positiveId } = require('../middleware/auth');

// Agent-facing: listings assigned to the agent (via property_listing.agent_id)
// and the applications, viewings and enquiries for those properties.
const router = express.Router();
router.use(requireAuth, requireAgent);

const AGENT_PROPERTIES = 'SELECT property_id FROM property_listing WHERE agent_id = ?';

// GET /api/agent/summary
router.get('/summary', handle(async (req, res) => {
  const id = req.agentId;
  const [[listings]] = await db.query("SELECT COUNT(*) AS n FROM property_listing WHERE agent_id = ? AND listing_status <> 'Archived'", [id]);
  const [[apps]] = await db.query(`SELECT COUNT(*) AS n FROM rental_application WHERE status = 'Pending' AND property_id IN (${AGENT_PROPERTIES})`, [id]);
  const [[viewings]] = await db.query(
    `SELECT COUNT(*) AS n FROM property_viewing WHERE status = 'Scheduled' AND viewing_datetime >= NOW() AND property_id IN (${AGENT_PROPERTIES})`,
    [id]
  );
  const [[enquiries]] = await db.query(`SELECT COUNT(*) AS n FROM property_enquiry WHERE status = 'New' AND property_id IN (${AGENT_PROPERTIES})`, [id]);
  res.json({
    activeListings: listings.n,
    pendingApplications: apps.n,
    upcomingViewings: viewings.n,
    newEnquiries: enquiries.n,
  });
}));

// GET /api/agent/listings
router.get('/listings', handle(async (req, res) => {
  const [rows] = await db.query(
    `SELECT pl.listing_id, pl.listing_status, pl.listed_date, pl.description,
            p.property_id, p.address, p.property_type, p.bedrooms, p.bathrooms, p.monthly_rent, p.status
     FROM property_listing pl JOIN property p ON p.property_id = pl.property_id
     WHERE pl.agent_id = ? ORDER BY pl.listed_date DESC`,
    [req.agentId]
  );
  res.json({ data: rows });
}));

// GET /api/agent/applications
router.get('/applications', handle(async (req, res) => {
  const [rows] = await db.query(
    `SELECT ra.rental_application_id, ra.application_date, ra.status,
            t.full_name AS tenant_name, t.phone, p.property_id, p.address, p.monthly_rent
     FROM rental_application ra
     JOIN property p ON p.property_id = ra.property_id
     JOIN tenant t ON t.tenant_id = ra.tenant_id
     WHERE ra.property_id IN (${AGENT_PROPERTIES})
     ORDER BY ra.application_date DESC`,
    [req.agentId]
  );
  res.json({ data: rows });
}));

// PATCH /api/agent/applications/:id { status: 'Approved' | 'Rejected' }
router.patch('/applications/:id', handle(async (req, res) => {
  const id = positiveId(req.params.id);
  const status = (req.body || {}).status;
  if (!id) return res.status(400).json({ error: 'Invalid application id' });
  if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ error: 'Status must be Approved or Rejected' });

  const [result] = await db.query(
    `UPDATE rental_application SET status = ?
     WHERE rental_application_id = ? AND status = 'Pending' AND property_id IN (${AGENT_PROPERTIES})`,
    [status, id, req.agentId]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Pending application not found for your listings' });
  res.json({ data: { rental_application_id: id, status } });
}));

// GET /api/agent/viewings
router.get('/viewings', handle(async (req, res) => {
  const [rows] = await db.query(
    `SELECT pv.property_viewing_id, pv.viewing_datetime, pv.status,
            t.full_name AS tenant_name, t.phone, p.address
     FROM property_viewing pv
     JOIN property p ON p.property_id = pv.property_id
     JOIN tenant t ON t.tenant_id = pv.tenant_id
     WHERE pv.property_id IN (${AGENT_PROPERTIES})
     ORDER BY pv.viewing_datetime`,
    [req.agentId]
  );
  res.json({ data: rows });
}));

// PATCH /api/agent/viewings/:id { status: 'Completed' | 'Cancelled' }
router.patch('/viewings/:id', handle(async (req, res) => {
  const id = positiveId(req.params.id);
  const status = (req.body || {}).status;
  if (!id) return res.status(400).json({ error: 'Invalid viewing id' });
  if (!['Completed', 'Cancelled'].includes(status)) return res.status(400).json({ error: 'Status must be Completed or Cancelled' });

  const [result] = await db.query(
    `UPDATE property_viewing SET status = ?
     WHERE property_viewing_id = ? AND status = 'Scheduled' AND property_id IN (${AGENT_PROPERTIES})`,
    [status, id, req.agentId]
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Scheduled viewing not found for your listings' });
  res.json({ data: { property_viewing_id: id, status } });
}));

// GET /api/agent/enquiries
router.get('/enquiries', handle(async (req, res) => {
  const [rows] = await db.query(
    `SELECT pe.enquiry_id, pe.enquirer_name, pe.enquirer_email, pe.message, pe.status, pe.created_at, p.address
     FROM property_enquiry pe JOIN property p ON p.property_id = pe.property_id
     WHERE pe.property_id IN (${AGENT_PROPERTIES})
     ORDER BY pe.created_at DESC`,
    [req.agentId]
  );
  res.json({ data: rows });
}));

// PATCH /api/agent/enquiries/:id { status: 'Responded' | 'Closed' }
router.patch('/enquiries/:id', handle(async (req, res) => {
  const id = positiveId(req.params.id);
  const status = (req.body || {}).status;
  if (!id) return res.status(400).json({ error: 'Invalid enquiry id' });
  if (!['Responded', 'Closed'].includes(status)) return res.status(400).json({ error: 'Status must be Responded or Closed' });

  const allowedFrom = status === 'Responded' ? ['New'] : ['New', 'Responded'];
  const [result] = await db.query(
    `UPDATE property_enquiry SET status = ?, handled_by_agent_id = ?
     WHERE enquiry_id = ? AND status IN (?) AND property_id IN (${AGENT_PROPERTIES})`,
    [status, req.agentId, id, allowedFrom, req.agentId]
  );
  if (!result.affectedRows) return res.status(400).json({ error: 'Invalid enquiry status change' });
  res.json({ data: { enquiry_id: id, status } });
}));

module.exports = router;
