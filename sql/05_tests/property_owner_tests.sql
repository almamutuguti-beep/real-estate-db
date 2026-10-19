-- TESTS - PROPERTY OWNER --

--TEST 1: Owner can add property ( SHOULD PASS )

INSERT INTO  property (property_owner_id, address, property_type, bedrooms, bathrooms, monthly_rent, status)
VALUES (1, 'Test Address 1', 'Apartment', 2, 1, 1200.00, 'Available');
-- EXPECTED: SUCCESS 

-- TEST 2: Cannot delete property with active lease agreements ( SHOULD FAIL )
-- First, ensure property 2 has an active lease ( if lease_agreement exists)
-- DELETE FROM property WHERE property_id = 2;
-- EXPECTED: SQLSTATE '45000' - Cannot delete property with active lease agreements

-- TEST 3: Can soft delete property with no active lease agreements ( SHOULD PASS )
UPDATE property
SET status = 'Removed'
WHERE property_id = (
    SELECT property_id FROM (
        SELECT p.property_id FROM property p
        WHERE p.property_owner_id = (
            SELECT property_owner_id FROM property_owner WHERE company_name = 'Dream Homes LLC'
        )
        AND p.property_id NOT IN (
            SELECT property_id FROM lease_agreement WHERE status = 'Active'
        )
        LIMIT 1
    ) AS t
);
-- EXPECTED: SUCCESS - Property status updated to 'Removed'

-- TEST 4: View returns only the logged-in owner's properties ( SHOULD PASS )
SELECT * FROM vw_owner_properties;
-- EXPECTED: SUCCESS - Only the logged-in owner's properties are returned

-- TEST 5: Income view ( SHOULD PASS once payment exists )
SELECT * FROM vw_owner_income;

-- TEST 6: Procedure - total income (SHOULD PASS once payment exists )
CALL sp_get_owner_total_income(
    (SELECT property_owner_id FROM property_owner WHERE company_name = 'Dream Homes LLC')
);

-- TEST 7: Procedure - properties for owner (SHOULD PASS)
CALL sp_get_owner_properties(
    (SELECT property_owner_id FROM property_owner WHERE company_name = 'Dream Homes LLC')
);

-- TEST 8: Duplicate owner email (SHOULD FAIL with error 1062)
INSERT INTO property_owner (company_name, email, user_id, phone)
VALUES ((
    SELECT user_id FROM user_account WHERE username = 'owner1'
), 'Test', 'info@dreamhomes.com', '123-456-7890'
);
