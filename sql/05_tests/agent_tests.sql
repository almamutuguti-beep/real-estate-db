
-
USE real_estate_db;

-- ===== Rule: agent can only list properties assigned to them =====
-- PASS: agent 1 lists property 1
INSERT INTO property_listing (property_id, agent_id, description)
VALUES (1, 1, 'Test listing by the assigned agent');
-- FAIL: property 3 belongs to agent 2. EXPECT ERROR 1644 (45000)
INSERT INTO property_listing (property_id, agent_id, description)
VALUES (3, 1, 'Test listing by the wrong agent');
-- FAIL: property 6 has no assigned agent. EXPECT ERROR 1644 (45000)
INSERT INTO property_listing (property_id, agent_id, description)
VALUES (6, 1, 'Test listing on an unassigned property');

-- ===== Rule: updates follow the same assignment rule =====
-- PASS: agent 1 edits the description of their own listing 1
UPDATE property_listing SET description = 'Updated description' WHERE listing_id = 1;
-- FAIL: move listing 1 to property 3 (agent 2). EXPECT ERROR 1644 (45000)
UPDATE property_listing SET property_id = 3 WHERE listing_id = 1;

-- ===== Rule: listing_status must be Draft, Published or Closed =====
-- PASS: valid status
INSERT INTO property_listing (property_id, agent_id, listing_status)
VALUES (1, 1, 'Published');
-- FAIL: EXPECT ERROR 3819 (check constraint)
INSERT INTO property_listing (property_id, agent_id, listing_status)
VALUES (1, 1, 'Bogus');

-- ===== Rule: enquiry needs an existing property =====
-- PASS: property 1 exists
INSERT INTO property_enquiry (property_id, enquirer_name, enquirer_email, message)
VALUES (1, 'Test Person', 'test@example.com', 'Is it still available?');
-- FAIL: property 999 does not exist. EXPECT ERROR 1452
INSERT INTO property_enquiry (property_id, enquirer_name, enquirer_email, message)
VALUES (999, 'Test Person', 'test@example.com', 'Is it still available?');
-- FAIL: bad status. EXPECT ERROR 3819
INSERT INTO property_enquiry (property_id, enquirer_name, enquirer_email, message, status)
VALUES (1, 'Test Person', 'test@example.com', 'Hello', 'Bogus');

-- ===== Rule: agent needs an existing user account, unique email =====
-- PASS: spare user 13
INSERT INTO agent (user_id, full_name, phone, email)
VALUES (13, 'Test Agent', '0722999999', 'test.agent@example.com');
-- FAIL: user 999 does not exist. EXPECT ERROR 1452
INSERT INTO agent (user_id, full_name, email)
VALUES (999, 'Ghost Agent', 'ghost@example.com');
-- FAIL: email already used by agent 1. EXPECT ERROR 1062
INSERT INTO agent (user_id, full_name, email)
VALUES (14, 'Duplicate Email', 'wanjiru.kamau@example.com');

-- ===== Procedure: sp_agent_review_application =====
-- PASS: application 1 is Pending, property 1 belongs to agent 1
CALL sp_agent_review_application(1, 1, 'Approved');
-- FAIL: new status Pending not allowed. EXPECT ERROR 1644
CALL sp_agent_review_application(3, 1, 'Pending');
-- FAIL: application 2 is for property 3 (agent 2). EXPECT ERROR 1644
CALL sp_agent_review_application(2, 1, 'Approved');
-- FAIL: application 3 is already Approved. EXPECT ERROR 1644
CALL sp_agent_review_application(3, 1, 'Rejected');

-- ===== Procedure: sp_agent_update_viewing =====
-- PASS: viewing 1 is Booked on property 1
CALL sp_agent_update_viewing(1, 1, 'Completed');
-- FAIL: viewing 2 is on property 3 (agent 2). EXPECT ERROR 1644
CALL sp_agent_update_viewing(2, 1, 'Completed');
-- FAIL: viewing 3 is already Completed. EXPECT ERROR 1644
CALL sp_agent_update_viewing(3, 1, 'Cancelled');

-- ===== Procedure: sp_agent_update_enquiry =====
-- PASS: enquiry 1 (New, property 1) -> Responded
CALL sp_agent_update_enquiry(1, 1, 'Responded');
-- FAIL: going back to New. EXPECT ERROR 1644
CALL sp_agent_update_enquiry(1, 1, 'New');
-- FAIL: enquiry 4 is on property 5 (agent 3). EXPECT ERROR 1644
CALL sp_agent_update_enquiry(4, 1, 'Closed');

-- ===== Access rule: views only show the agent's own rows =====
-- Agent 1 sees applications on properties 1 and 2 only
SELECT * FROM v_agent_applications WHERE agent_id = 1;
-- Agent 2 sees a different set (properties 3 and 4)
SELECT * FROM v_agent_applications WHERE agent_id = 2;
SELECT * FROM v_agent_viewings  WHERE agent_id = 1;
SELECT * FROM v_agent_enquiries WHERE agent_id = 1;
SELECT * FROM v_agent_tenants   WHERE agent_id = 1;
