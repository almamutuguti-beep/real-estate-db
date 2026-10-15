-- sql/02_triggers/agent_triggers.sql
-- Rule: an agent may only add or update listings for properties assigned to them.
USE real_estate_db;

DROP TRIGGER IF EXISTS trg_property_listing_bi_assigned_agent;
DROP TRIGGER IF EXISTS trg_property_listing_bu_assigned_agent;

DELIMITER $$

CREATE TRIGGER trg_property_listing_bi_assigned_agent
BEFORE INSERT ON property_listing
FOR EACH ROW
BEGIN
    DECLARE v_assigned INT UNSIGNED DEFAULT NULL;
    SELECT assigned_agent_id INTO v_assigned
    FROM property WHERE property_id = NEW.property_id;
    IF v_assigned IS NULL OR v_assigned <> NEW.agent_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Agent is not assigned to this property';
    END IF;
END$$

CREATE TRIGGER trg_property_listing_bu_assigned_agent
BEFORE UPDATE ON property_listing
FOR EACH ROW
BEGIN
    DECLARE v_assigned INT UNSIGNED DEFAULT NULL;
    SELECT assigned_agent_id INTO v_assigned
    FROM property WHERE property_id = NEW.property_id;
    IF v_assigned IS NULL OR v_assigned <> NEW.agent_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Agent is not assigned to this property';
    END IF;
END$$

DELIMITER ;
