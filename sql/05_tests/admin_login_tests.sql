-- sql/05_tests/admin_login_tests.sql
-- Tests for sp_login. Everything is undone at the end

USE real_estate_db;
START TRANSACTION;

-- Setup: an Admin who can log in, unverified tenant, an inactive tenant
INSERT INTO user_account (username, password_hash, role, is_verified)
VALUES ('login_admin', SHA2('Pass123', 256), 'Admin', TRUE);

INSERT INTO user_account (username, password_hash, role, is_verified)
VALUES ('login_unverified', SHA2('Pass123', 256), 'Tenant');

INSERT INTO user_account (username, password_hash, role, is_verified, is_active)
VALUES ('login_inactive', SHA2('Pass123', 256), 'Tenant', TRUE, FALSE);

-- L1 PASS: correct login returns 1 row
CALL sp_login('login_admin', SHA2('Pass123!', 256));

-- L2 FAIL: wrong password returns 0 rows
CALL sp_login('login_admin', SHA2('wrong', 256));

-- L3 FAIL: unverfied account returns 0 rows
CALL sp_login('login_unverfied', SHA2('Pass123!', 256));

-- L4 FAIL: inactive account returns 0 rows
CALL sp_login('login_inactive', SHA2('Pass123!', 256));

ROLLBACK;




