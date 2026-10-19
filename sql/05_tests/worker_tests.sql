USE real_estate_db;
SET @current_user_role = 'Admin';
UPDATE maintenance_request SET assigned_to = 99 WHERE request_id =1;
UPDATE maintenance_request SET assigned_to =1 WHERE request_id = 1;

SET @current_user_role = 'Worker';
UPDATE maintenance_request SET assigned_to =2 WHERE request_id =2;
SET @current_user_role = 'Admin';
UPDATE maintenance_request SET assigned_to =2 WHERE request_id =2;
SET @current_user_role = 'Worker';
CALL sp_start_job(3, 3);
CALL sp_start_job(3, 1);
CALL sp_complete_job(1, 1);
CALL sp_complete_job(4, 2);

SELECT request_id, status, completed_at FROM maintenance_request WHERE request_id = 4;
INSERT INTO maintenance_request (property_id, tenant_id,description)
VALUES (6, 1, 'Test request with no worker');
SELECT request_id, assigned_to, status FROM maintenance_request ORDER BY request_id DESC LIMIT 1;