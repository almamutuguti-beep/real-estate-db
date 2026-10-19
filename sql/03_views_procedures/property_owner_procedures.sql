DROP VIEW IF EXISTS vw_owner_properties;
DROP VIEW IF EXISTS vw_owner_income;
DROP PROCEDURE IF EXISTS sp_get_owner_total_income;
DROP PROCEDURE IF EXISTS sp_get_owner_properties;


-- View: Owner sees only their own properties
CREATE VIEW vw_owner_properties AS
SELECT
 p.property_id, 
 p.address, 
 p.property_type, 
 p.bedrooms, 
 p.bathrooms,
 p.monthly_rent,
 p.status,
 p.create_date
 FROM property p
 JOIN property_owner po ON p.property_owner_id = po.property_owner_id
 where po.db_user = SUBSTRING_INDEX(CURRENT_USER(), '@', 1);

 -- View: Owner sees only their own income
CREATE VIEW vw_owner_income AS
SELECT
    p.property_id,
    p.address,
    p.monthly_rent,
    COUNT(DISTINCT l.lease_id) AS active_leases,
    COALESCE(SUM(CASE WHEN pm.status = 'Completed' THEN pm.amount ELSE 0 END), 0) AS total_received
FROM property p
JOIN property_owner po ON p.property_owner_id = po.property_owner_id
    LEFT JOIN lease_agreement l ON p.property_id = l.property_id AND l.status = 'Active'
    LEFT JOIN payment pm ON l.lease_id = pm.lease_id
WHERE po.db_user = SUBSTRING_INDEX(CURRENT_USER(), '@', 1)
GROUP BY p.property_owner_id, p.address, p.monthly_rent;

--Procedure: Get owners total income
DELIMITER $$
CREATE PROCEDURE sp_get_owner_total_income (IN owner_id INT UNSIGNED)
BEGIN
SELECT
    po.company_name,
    COUNT(DISTINCT p.property_id) AS total_properties,
    COUNT(DISTINCT CASE WHEN p.status = 'Available' THEN p.property_id END) AS available_properties,
    COUNT(DISTINCT CASE WHEN p.status = 'Rented' THEN p.property_id END) AS rented_properties,
    COUNT(DISTINCT CASE WHEN p.status = 'Removed' THEN p.property_id END) AS removed_properties,
    COALESCE(SUM(CASE WHEN pm.status = 'Completed' THEN pm.amount ELSE 0 END), 0) AS total_income_received
     FROM property_owner po
    LEFT JOIN property p ON po.property_owner_id = p.property_owner_id
    LEFT JOIN lease_agreement l ON p.property_id = l.property_id
    LEFT JOIN payment pm ON l.lease_id = pm.lease_id
    WHERE po.property_owner_id = owner_id
    GROUP BY po.company_name;
END$$
DELIMITER ;

-- Procedure: List all properties for a specific owner
DELIMITER $$
CREATE PROCEDURE sp_get_owner_properties (IN owner_id INT UNSIGNED)
BEGIN
    SELECT
        p.property_id,
        p.address,
        p.property_type,
        p.bedrooms,
        p.bathrooms,
        p.monthly_rent,
        p.status,
        COUNT(DISTINCT l.lease_id) AS active_leases,
        COALESCE(SUM(CASE WHEN pm.status = 'Completed' THEN pm.amount ELSE 0 END), 0) AS income_received
    FROM property p
    LEFT JOIN lease_agreement l ON p.property_id = l.property_id AND l.status = 'Active'
    LEFT JOIN payment pm ON l.lease_id = pm.lease_id
    WHERE p.property_owner_id = owner_id
    GROUP BY p.property_id, p.address,
END
DELIMITER ;

