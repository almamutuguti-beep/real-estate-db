-- sql/03_views_procedures/admin_user_procedures.sql
-- Admin account management: create , verify, deactivate

USE real_estate_db;
DROP PROCEDURE IF EXISTS sp_create_user;
DROP PROCEDURE IF EXISTS sp_verify_user;
DROP PROCEDURE IF EXISTS sp_deactivate_user;

DELIMITER $$

CREATE PROCEDURE sp_create_user (
	IN p_admin_id INT UNSIGNED,
    IN p_username VARCHAR(50),
    IN p_password_hash VARCHAR(255),
    IN p_role VARCHAR(20)
)

BEGIN 
	INSERT INTO user_account (username, password_hash, role, created_by)
    VALUES (p_username, p_password_hash, p_role, p_admin_id);
    SELECT LAST_INSERT_ID() AS new_user_id;
END$$

CREATE PROCEDURE sp_verify_user (
	IN p_admin_id INT UNSIGNED,
    IN p_user_id INT UNSIGNED
)

BEGIN
	DECLARE admin_role VARCHAR(20);
    DECLARE found INT;
    
    SELECT role INTO admin_role FROM user_account
		WHERE user_id = p_admin_id AND is_active = TRUE;
	IF admin_role IS NULL OR admin_role <> "Admin" THEN 
		SIGNAL SQLSTATE '45000'
			SET MESSAGE_TEXT = 'Only an active Admin can verify account';
	END IF;
    
    SELECT COUNT(*) INTO found FROM  user_account WHERE user_id  = p_user_id;
    IF found = 0 THEN 
		SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No such account';
	END IF;   
    
    UPDATE user_account SET is_verfified = TRUE WHERE user_id = p_user_id;
    END $$
    
    CREATE PROCEDURE sp_deactivate_user(
		IN p_admin_id INT UNSIGNED,
        IN p_user_id INT UNSIGNED
    )
    
    BEGIN
		DECLARE admin_role VARCHAR(20);
        DECLARE found INT;
        
        SELECT role INTO admin_role FROM user_account
        WHERE user_id = p_admin_id AND is_active = TRUE;
        
        IF admin_role IS NULL OR admin_role <> 'Admin' THEN 
			SIGNAL SQLSTATE '45000'
				SET MESSAGE_TEXT = "Only an active admin can deactivate accounts";
		END IF;
        
        SELECT COUNT(*) INTO FOUND FROM user_account WHERE user_id = p_user_id;
        IF found = 0 THEN 
			SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No such account';
		END IF;
        
        UPDATE user_account SET is_active = FALSE WHERE user_id = p_user_id;
	END $$
    
    DELIMITER ;
    
            
        