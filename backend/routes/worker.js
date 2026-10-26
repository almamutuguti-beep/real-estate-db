const express = require('express');
const db = require('../db');
const { requireAuth, requireWorker, handle, positiveId } = require('../middleware/auth');

// Maintenance worker: assigned jobs plus the open (unassigned) request pool.
const router = express.Router();
router.use(requireAuth, requireWorker);

const JOB_COLUMNS = `mr.request_id, mr.description, mr.status, mr.created_at, mr.completed_at,
                     p.address, t.full_name AS tenant_name, t.phone AS tenant_phone`;

// GET /api/worker/summary
router.get('/summary', handle(async (req, res) => {
  const id = req.workerId;
  const [counts] = await db.query('SELECT status, COUNT(*) AS n FROM maintenance_request WHERE assigned_to = ? GROUP BY status', [id]);
  const [[open]] = await db.query("SELECT COUNT(*) AS n FROM maintenance_request WHERE status = 'Open' AND assigned_to IS NULL");
  const [[month]] = await db.query(
    "SELECT COUNT(*) AS n FROM maintenance_request WHERE assigned_to = ? AND status = 'Complete' AND completed_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')",
    [id]
  );
  const by = Object.fromEntries(counts.map((r) => [r.status, r.n]));
  res.json({
    assigned: by.Assigned || 0,
    inProgress: by['In Progress'] || 0,
    completedThisMonth: month.n,
    openPool: open.n,
  });
}));

// GET /api/worker/jobs
router.get('/jobs', handle(async (req, res) => {
  const [rows] = await db.query(
    `SELECT ${JOB_COLUMNS}
     FROM maintenance_request mr
     JOIN property p ON p.property_id = mr.property_id
     JOIN tenant t ON t.tenant_id = mr.tenant_id
     WHERE mr.assigned_to = ?
     ORDER BY FIELD(mr.status, 'In Progress', 'Assigned', 'Complete'), mr.created_at DESC`,
    [req.workerId]
  );
  res.json({ data: rows });
}));

// GET /api/worker/open
router.get('/open', handle(async (req, res) => {
  const [rows] = await db.query(
    `SELECT ${JOB_COLUMNS}
     FROM maintenance_request mr
     JOIN property p ON p.property_id = mr.property_id
     JOIN tenant t ON t.tenant_id = mr.tenant_id
     WHERE mr.status = 'Open' AND mr.assigned_to IS NULL
     ORDER BY mr.created_at`
  );
  res.json({ data: rows });
}));

// POST /api/worker/jobs/:id/claim
router.post('/jobs/:id/claim', handle(async (req, res) => {
  const id = positiveId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid request id' });
  const [result] = await db.query(
    "UPDATE maintenance_request SET assigned_to = ?, status = 'Assigned' WHERE request_id = ? AND status = 'Open' AND assigned_to IS NULL",
    [req.workerId, id]
  );
  if (!result.affectedRows) return res.status(409).json({ error: 'This job has already been taken' });
  res.json({ data: { request_id: id, status: 'Assigned' } });
}));

// PATCH /api/worker/jobs/:id { status: 'In Progress' | 'Complete' }
router.patch('/jobs/:id', handle(async (req, res) => {
  const id = positiveId(req.params.id);
  const status = (req.body || {}).status;
  if (!id) return res.status(400).json({ error: 'Invalid request id' });
  if (!['In Progress', 'Complete'].includes(status)) return res.status(400).json({ error: 'Status must be In Progress or Complete' });

  const [[job]] = await db.query('SELECT status FROM maintenance_request WHERE request_id = ? AND assigned_to = ?', [id, req.workerId]);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (status === 'In Progress' && job.status !== 'Assigned') return res.status(400).json({ error: 'Only an assigned job can be started' });
  if (status === 'Complete' && job.status !== 'In Progress') return res.status(400).json({ error: 'Start the job before completing it' });

  if (status === 'In Progress') await db.query('CALL sp_start_job(?, ?)', [id, req.workerId]);
  else {
    await db.query('CALL sp_complete_job(?, ?)', [id, req.workerId]);
    await db.query('UPDATE maintenance_request SET completed_at = COALESCE(completed_at, NOW()) WHERE request_id = ?', [id]);
  }
  res.json({ data: { request_id: id, status } });
}));

module.exports = router;
