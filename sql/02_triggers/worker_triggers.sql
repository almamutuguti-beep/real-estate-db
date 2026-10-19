USE real_estate_db;
DROP TRIGGER IF EXISTS trg_maintenance_request_before_update;

DELIMITER $$
CREATE TRIGGER trg_maintenance_request_before_update
BEFORE UPDATE ON maintenance_request
FOR EACH ROW
BEGIN
IF NOT  (OLD.assigned_to <=>NEW.assigned_to) THEN
IF NOT (@current_user_role<=> 'Admin') THEN
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'Only an Admin can assign a maintenance worker';
END IF;

IF OLD.assigned_to IS NULL THEN
SET NEW.status = 'Assigned';
END IF;
END IF;

IF NEW.status <> OLD.status AND NEW.status IN ('In Progress','Complete')THEN
IF NOT (@current_worker_id <=> OLD.assigned_to)THEN
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'Only the assigned worker can update this job';
END IF;
END IF;

IF NEW.status <> OLD.status THEN
IF NOT ((OLD.status = 'Open' AND NEW.status ='Assigned')
OR (OLD.status = 'Assigned' AND NEW.status = 'In Progress')
OR (OLD.status= 'In Progress' AND NEW.status = 'Complete'))THEN
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'Invalid status change for a maintenance request';
END IF;
IF NEW.status = 'Complete' THEN
SET NEW.completed_at = NOW();
END IF;
END IF;
END$$
DELIMITER ;