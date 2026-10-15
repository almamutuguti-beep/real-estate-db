-- sql/02_triggers/admin_triggers.sql
-- Rule: only an admin may create accounts (tenants may register themselves)

USE real_estate_db;
DROP TRIGGER IF EXISTS trg_user_account_before_insert;

DELIMITER $$
CREATE TRIGGER trg_user_account_before_insert
BEFORE INSERT ON user_account
FOR EACH ROW
BEGIN
	DECLARE creator_role VARCHAR(20);
    DECLARE admin_count INT;
    
    IF NEW.created_by IS NULL THEN 
		SELECT COUNT(*) INTO admin_count FROM user_account WHERE role = "Admin";
        IF NOT (NEW.role = "Tenant" OR (NEW.role = "Admin" AND admin_count = 0)) THEN SIGNAL SQLSTATE "45000"
			SET MESSAGE_TEXT = 'Only an admin can create this account';
        END IF;
	ELSE 
		SELECT role INTO creator_role FROM user_account WHERE user_id = NEW.created_by;
        IF creator_role IS NULL OR creator_role <> "Admin" THEN 
			SIGNAL SQLSTATE "45000"
				SET MESSAGE_TEXT = 'created_by must be an Admin account';
		END IF;
	END IF;
END$$
DELIMITER ;

        
