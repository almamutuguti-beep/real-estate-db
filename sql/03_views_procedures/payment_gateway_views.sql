USE real_estate_db;

DROP VIEW IF EXISTS v_payment_ledger;

CREATE VIEW v_payment_ledger AS
SELECT
    p.payment_id,
    p.lease_id,
    l.property_id,
    pr.title                    AS property_title,
    pr.owner_id,
    p.tenant_id,
    t.full_name                 AS tenant_name,
    p.amount,
    p.payment_method,
    p.gateway_confirmation_id,
    p.confirmation_status,
    p.status,
    p.payment_date
FROM payment p
JOIN lease_agreement l ON l.lease_id     = p.lease_id
JOIN tenant t          ON t.tenant_id    = p.tenant_id
JOIN property pr       ON pr.property_id = l.property_id;