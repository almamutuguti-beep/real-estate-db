USE real_estate_db;

-- PASS: registered tenant applies
INSERT INTO rental_application (tenant_id, property_id, application_date)
VALUES (1, 1, CURDATE());

-- FAIL (expected): unregistered tenant (id 9999) applies -> FK error
INSERT INTO rental_application (tenant_id, property_id, application_date)
VALUES (9999, 1, CURDATE());

-- FAIL (expected): invalid status -> CHECK error
UPDATE rental_application SET status = 'Maybe' WHERE rental_application_id = 1;