USE real_estate_db;

CREATE OR REPLACE VIEW v_tenant_signed_lease AS
SELECT lease_id, rental_application_id, tenant_id, property_id,
       start_date, end_date, monthly_rent, status, signed_date
FROM lease_agreement
WHERE status <> 'Draft' AND signed_date IS NOT NULL;
