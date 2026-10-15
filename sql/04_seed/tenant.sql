USE real_estate_db;

-- Rule: tenant sees a lease only once it is signed
CREATE OR REPLACE VIEW v_tenant_signed_lease AS
SELECT tenant_id, lease_agreement_id, property_id, signed_date
FROM lease_agreement
WHERE status = 'Signed';

DELIMITER //

-- Rule: tenant sees only their own payments
CREATE PROCEDURE sp_tenant_payments (IN p_tenant_id INT UNSIGNED)
BEGIN
    SELECT p.*
    FROM payment p
    JOIN lease_agreement l ON p.lease_agreement_id = l.lease_agreement_id
    WHERE l.tenant_id = p_tenant_id;
END //

DELIMITER ;
