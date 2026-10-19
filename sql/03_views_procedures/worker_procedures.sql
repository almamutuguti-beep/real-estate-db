USE real_estate_db;

DROP PROCEDURE IF EXISTS sp_worker_jobs;
DROP PROCEDURE IF EXISTS sp_start_job;
DROP PROCEDURE IF EXISTS sp_complete_job;

DELIMITER $$

CREATE PROCEDURE sp_worker_jobs (IN p_worker_id INT UNSIGNED)
BEGIN
SELECT *
FROM v_worker_jobs
WHERE worker_id = p_worker_id;
END$$

CREATE PROCEDURE sp_start_job(IN p_request_id INT UNSIGNED,IN p_worker_id INT UNSIGNED)
BEGIN
SET @current_worker_id = p_worker_id;
UPDATE maintenance_request
SET status = 'In Progress'
WHERE request_id = p_request_id;
END$$

CREATE PROCEDURE sp_complete_job(IN p_request_id INT UNSIGNED,IN p_worker_id INT UNSIGNED)
BEGIN
SET @current_worker_id = p_worker_id;
UPDATE maintenance_request
SET status = 'Complete'
WHERE request_id = p_request_id;
END$$

DELIMITER ;

