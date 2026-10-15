-- sql/03_views_procedures/agent_views.sql
-- A view cannot take a parameter, so each view exposes an agent_id column
-- (the agent assigned to the property). Always query with WHERE agent_id = <id>.
-- Needs the Tenant tables (tenant, rental_application, property_viewing) to exist.
USE real_estate_db;

DROP VIEW IF EXISTS v_agent_applications;
DROP VIEW IF EXISTS v_agent_viewings;
DROP VIEW IF EXISTS v_agent_enquiries;
DROP VIEW IF EXISTS v_agent_tenants;

CREATE VIEW v_agent_applications AS
SELECT p.assigned_agent_id AS agent_id,
       ra.application_id, ra.tenant_id, t.full_name AS tenant_name,
       ra.property_id, p.title AS property_title,
       ra.status, ra.handled_by_agent_id, ra.submitted_at
FROM rental_application ra
JOIN property p ON p.property_id = ra.property_id
JOIN tenant t   ON t.tenant_id   = ra.tenant_id
WHERE p.assigned_agent_id IS NOT NULL;

CREATE VIEW v_agent_viewings AS
SELECT p.assigned_agent_id AS agent_id,
       pv.viewing_id, pv.tenant_id, t.full_name AS tenant_name,
       pv.property_id, p.title AS property_title,
       pv.viewing_datetime, pv.status
FROM property_viewing pv
JOIN property p ON p.property_id = pv.property_id
JOIN tenant t   ON t.tenant_id   = pv.tenant_id
WHERE p.assigned_agent_id IS NOT NULL;

CREATE VIEW v_agent_enquiries AS
SELECT p.assigned_agent_id AS agent_id,
       pe.enquiry_id, pe.property_id, p.title AS property_title,
       pe.enquirer_name, pe.enquirer_email, pe.message,
       pe.handled_by_agent_id, pe.status, pe.created_at
FROM property_enquiry pe
JOIN property p ON p.property_id = pe.property_id
WHERE p.assigned_agent_id IS NOT NULL;

-- Manage Tenants: tenants who applied or booked a viewing on the agent's properties.
-- UNION (not UNION ALL) removes tenants who did both.
CREATE VIEW v_agent_tenants AS
SELECT p.assigned_agent_id AS agent_id,
       t.tenant_id, t.full_name, t.phone, t.email
FROM rental_application ra
JOIN property p ON p.property_id = ra.property_id
JOIN tenant t   ON t.tenant_id   = ra.tenant_id
WHERE p.assigned_agent_id IS NOT NULL
UNION
SELECT p.assigned_agent_id,
       t.tenant_id, t.full_name, t.phone, t.email
FROM property_viewing pv
JOIN property p ON p.property_id = pv.property_id
JOIN tenant t   ON t.tenant_id   = pv.tenant_id
WHERE p.assigned_agent_id IS NOT NULL;
