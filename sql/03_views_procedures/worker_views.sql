USE real_estate_db;

DROP VIEW IF EXISTS v_worker_jobs;
CREATE VIEW v_worker_jobs AS
SELECT request_id,
       assigned_to AS worker_id,
       property_id,
       tenant_id,
       description,
       status,
       created_at,
       completed_at
FROM maintenance_request
WHERE assigned_to IS NOT NULL;

DROP VIEW IF EXISTS v_open_requests;
CREATE VIEW v_open_requests AS
SELECT request_id,
       property_id,
       tenant_id,
       description,
       created_at
FROM maintenance_request
WHERE STATUS = 'Open'
AND assigned_to IS NULL;
    
