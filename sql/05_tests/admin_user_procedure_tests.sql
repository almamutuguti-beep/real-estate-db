-- sql/05_tests/admin_user_procedure_tests.sql
-- Tests for sp_create_user, sp_verify_user, sp_deactivate_user.
-- Needs an EMPTY user_account. Everything is undone at the end.

USE real_estate_db;
START TRANSACTION;

-- Setup: the first Admin (allowed because no Admin exists) and a self-registered Tenant
INSERT INTO user_account (username, password_hash, role, is_verified)
VALUES ('proc_admin', SHA2('Pass123!', 256), 'Admin', TRUE);
SET @admin = LAST_INSERT_ID();

INSERT INTO user_account (username, password_hash, role, is_verified)
VALUES ('proc_tenant', SHA2('Pass123!', 256), 'Tenant', TRUE);
SET @tenant = LAST_INSERT_ID();

-- P1 PASS: Admin creates an Agent account
CALL sp_create_user(@admin, 'proc_agent', SHA2('Pass123!', 256), 'Agent');
SET @new = (SELECT user_id FROM user_account WHERE username = 'proc_agent');

-- P2 FAIL (expect 1062): duplicate username
CALL sp_create_user(@admin, 'proc_agent', SHA2('Pass123!', 256), 'Agent');

-- P3 FAIL (expect 1644): a Tenant tries to create an Owner
CALL sp_create_user(@tenant, 'proc_owner_bad', SHA2('Pass123!', 256), 'Owner');

-- P4: login is refused (0 rows) because the new account is not verified yet
CALL sp_login('proc_agent', SHA2('Pass123!', 256));

-- P5 PASS: Admin verifies the account, then login returns 1 row
CALL sp_verify_user(@admin, @new);
CALL sp_login('proc_agent', SHA2('Pass123!', 256));

-- P6 FAIL (expect 1644): a Tenant tries to verify an account
CALL sp_verify_user(@tenant, @new);

-- P7 FAIL (expect 1644): verifying an account that does not exist
CALL sp_verify_user(@admin, 99999);

-- P8 PASS: Admin deactivates the account, then login returns 0 rows
CALL sp_deactivate_user(@admin, @new);
CALL sp_login('proc_agent', SHA2('Pass123!', 256));

ROLLBACK;