-- sql/03_views_procedures/admin_procedures.sql
-- Login : only verified, active account get in 

USE real_estate_db;
DROP PROCEDURE IF EXISTS sp_login;

DELIMITER $$
CREATE PROCEDURE sp_login(
	IN p_username VARCHAR(50),
    IN p_password_hash VARCHAR(255)
)
BEGIN
	SELECT user_id, role
    FROM user_account
    Where username = p_username
		AND password_hash = p_password_hash
        AND is_verfied = TRUE
        AND is_active = TRUE;
END$$
DELIMITER ;
