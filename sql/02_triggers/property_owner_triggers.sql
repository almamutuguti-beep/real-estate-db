-- PREVENT DELETION OF PROPERTY WITH ACTIVE LEASE AGREEMENTS
DELIMITER $$
CREATE TRIGGER
trg_prevent_delete_property_with_lease
BEFORE DELETE ON property
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1 FROM lease_agreement
        WHERE property_id = OLD.property_id
        AND status = 'Active'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot delete property with active lease agreements';
    END IF;
    END
    DELIMITER ;
 
-- PREVENT SOFT DELETE OF PROPERTY WITH ACTIVE LEASE AGREEMENTS
DELIMITER $$
CREATE TRIGGER
trg_prevent_remove_property_with_lease
BEFORE UPDATE ON property
FOR EACH ROW
BEGIN
    IF NEW.status = 'Removed' AND OLD.status != 'Removed' THEN
        IF EXISTS (
            SELECT 1 FROM lease_agreement
            WHERE property_id = OLD.property_id
            AND status = 'Active'
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot remove property with active lease';
        END IF;
    END IF;
END $$
DELIMITER ;