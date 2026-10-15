-- sql/05_tests/admin_tests.sql
-- Tests for the user_account trigger. Everything is undone at the end.

USE real_estate_db;
START TRANSACTION;

-- T1 PASS: the very first Admin, no creator, no Admin exists yet
INSERT INTO user_account (username, password_hash, role)
VALUES ('test_admin', SHA2('Pass123!', 256), 'Admin');
SET @admin_id = LAST_INSERT_ID();

-- T2 PASS: a tenant registers themselves
INSERT INTO user_account (username, password_hash, role)
VALUES ('test_tenant', SHA2('Pass123!', 256), 'Tenant');
SET @tenant_id = LAST_INSERT_ID();

-- T3 FAIL (expect error 1644): an Agent with no creator
INSERT INTO user_account (username, password_hash, role)
VALUES ('test_agent_self', SHA2('Pass123!', 256), 'Agent');

-- T4 FAIL (expect error 1644): a second Admin with no creator
INSERT INTO user_account (username, password_hash, role)
VALUES ('test_admin2', SHA2('Pass123!', 256), 'Admin');

-- T5 PASS: the Admin creates an Agent
INSERT INTO user_account (username, password_hash, role, created_by)
VALUES ('test_agent', SHA2('Pass123!', 256), 'Agent', @admin_id);

-- T6 FAIL (expect error 1644): a Tenant tries to create an Owner
INSERT INTO user_account (username, password_hash, role, created_by)
VALUES ('test_owner_bad', SHA2('Pass123!', 256), 'Owner', @tenant_id);

-- T7 FAIL (expect error 1644): the creator id does not exist
INSERT INTO user_account (username, password_hash, role, created_by)
VALUES ('test_owner_ghost', SHA2('Pass123!', 256), 'Owner', 99999);

-- Undo every test row
ROLLBACK;