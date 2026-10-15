-- sql/03_views_procedures/agent_procedures.sql
-- Each procedure takes the agent id and checks the property is assigned to that agent.
USE real_estate_db;

DROP PROCEDURE IF EXISTS sp_agent_review_application;
DROP PROCEDURE IF EXISTS sp_agent_update_viewing;
DROP PROCEDURE IF EXISTS sp_agent_update_enquiry;

DELIMITER $$

-- Pending -> Approved or Rejected only.
CREATE PROCEDURE sp_agent_review_application(
    IN p_application_id INT UNSIGNED,
    IN p_agent_id       INT UNSIGNED,
    IN p_new_status     VARCHAR(20))
BEGIN
    DECLARE v_status      VARCHAR(20)  DEFAULT NULL;
    DECLARE v_property_id INT UNSIGNED DEFAULT NULL;
    DECLARE v_assigned    INT UNSIGNED DEFAULT NULL;

    SELECT status, property_id INTO v_status, v_property_id
    FROM rental_application WHERE application_id = p_application_id;

    IF v_property_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application not found';
    END IF;

    SELECT assigned_agent_id INTO v_assigned
    FROM property WHERE property_id = v_property_id;

    IF v_assigned IS NULL OR v_assigned <> p_agent_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Application is not for a property assigned to this agent';
    END IF;
    IF p_new_status IS NULL OR p_new_status NOT IN ('Approved','Rejected') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'New status must be Approved or Rejected';
    END IF;
    IF v_status IS NULL OR v_status <> 'Pending' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only a Pending application can be reviewed';
    END IF;

    UPDATE rental_application
    SET status = p_new_status, handled_by_agent_id = p_agent_id
    WHERE application_id = p_application_id;

    SELECT CONCAT('Application ', p_application_id, ' is now ', p_new_status) AS message;
END$$

-- Booked -> Completed or Cancelled only.
CREATE PROCEDURE sp_agent_update_viewing(
    IN p_viewing_id INT UNSIGNED,
    IN p_agent_id   INT UNSIGNED,
    IN p_new_status VARCHAR(20))
BEGIN
    DECLARE v_status      VARCHAR(20)  DEFAULT NULL;
    DECLARE v_property_id INT UNSIGNED DEFAULT NULL;
    DECLARE v_assigned    INT UNSIGNED DEFAULT NULL;

    SELECT status, property_id INTO v_status, v_property_id
    FROM property_viewing WHERE viewing_id = p_viewing_id;

    IF v_property_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Viewing not found';
    END IF;

    SELECT assigned_agent_id INTO v_assigned
    FROM property WHERE property_id = v_property_id;

    IF v_assigned IS NULL OR v_assigned <> p_agent_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Viewing is not for a property assigned to this agent';
    END IF;
    IF p_new_status IS NULL OR p_new_status NOT IN ('Completed','Cancelled') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'New status must be Completed or Cancelled';
    END IF;
    IF v_status IS NULL OR v_status <> 'Booked' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Only a Booked viewing can be updated';
    END IF;

    UPDATE property_viewing
    SET status = p_new_status, agent_id = p_agent_id
    WHERE viewing_id = p_viewing_id;

    SELECT CONCAT('Viewing ', p_viewing_id, ' is now ', p_new_status) AS message;
END$$

-- Manage Property Enquiries: New -> Responded -> Closed (New may go straight to Closed).
CREATE PROCEDURE sp_agent_update_enquiry(
    IN p_enquiry_id INT UNSIGNED,
    IN p_agent_id   INT UNSIGNED,
    IN p_new_status VARCHAR(20))
BEGIN
    DECLARE v_status      VARCHAR(20)  DEFAULT NULL;
    DECLARE v_property_id INT UNSIGNED DEFAULT NULL;
    DECLARE v_assigned    INT UNSIGNED DEFAULT NULL;

    SELECT status, property_id INTO v_status, v_property_id
    FROM property_enquiry WHERE enquiry_id = p_enquiry_id;

    IF v_property_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Enquiry not found';
    END IF;

    SELECT assigned_agent_id INTO v_assigned
    FROM property WHERE property_id = v_property_id;

    IF v_assigned IS NULL OR v_assigned <> p_agent_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Enquiry is not for a property assigned to this agent';
    END IF;
    IF COALESCE((v_status = 'New' AND p_new_status IN ('Responded','Closed'))
             OR (v_status = 'Responded' AND p_new_status = 'Closed'), FALSE) = FALSE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid enquiry status change';
    END IF;

    UPDATE property_enquiry
    SET status = p_new_status, handled_by_agent_id = p_agent_id
    WHERE enquiry_id = p_enquiry_id;

    SELECT CONCAT('Enquiry ', p_enquiry_id, ' is now ', p_new_status) AS message;
END$$

DELIMITER ;
