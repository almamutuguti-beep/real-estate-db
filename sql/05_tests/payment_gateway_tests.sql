USE real_estate_db;

START TRANSACTION;

-- ---------- Setup ----------
SET @active_lease    := (SELECT lease_id FROM lease_agreement WHERE status = 'Active' ORDER BY lease_id LIMIT 1);
SET @active_tenant   := (SELECT tenant_id FROM lease_agreement WHERE lease_id = @active_lease);
SET @active_rent     := (SELECT monthly_rent FROM lease_agreement WHERE lease_id = @active_lease);
SET @other_tenant    := (SELECT tenant_id FROM tenant WHERE tenant_id <> @active_tenant ORDER BY tenant_id LIMIT 1);
SET @inactive_lease  := (SELECT lease_id FROM lease_agreement WHERE status IN ('Draft', 'Ended') ORDER BY lease_id LIMIT 1);
SET @inactive_tenant := (SELECT tenant_id FROM lease_agreement WHERE lease_id = @inactive_lease);

SELECT @active_lease, @active_tenant, @active_rent, @other_tenant, @inactive_lease, @inactive_tenant;

-- RULE 1: payment only on an Active lease
-- T1 PASS. EXPECT: succeeds, status Pending
CALL sp_process_payment(@active_lease, @active_tenant, @active_rent, 'M-Pesa');
SET @pay1 := LAST_INSERT_ID();

-- T2 FAIL. EXPECT: ERROR 1644 A payment can only be made against an Active lease
INSERT INTO payment (lease_id, tenant_id, amount, payment_method)
VALUES (@inactive_lease, @inactive_tenant, 1000.00, 'Card');

-- T3 FAIL. EXPECT: ERROR 1452 (lease does not exist)
INSERT INTO payment (lease_id, tenant_id, amount, payment_method)
VALUES (999999, @active_tenant, 1000.00, 'Card');

-- RULE 2: tenant must match the lease tenant
-- T4 FAIL. EXPECT: ERROR 1644 The tenant on the payment does not match the tenant on the lease
INSERT INTO payment (lease_id, tenant_id, amount, payment_method)
VALUES (@active_lease, @other_tenant, @active_rent, 'Bank');

-- RULE 3: Complete only after the gateway confirms
-- T5 FAIL. EXPECT: ERROR 1644 A payment can only be Complete after the gateway confirms it
UPDATE payment SET status = 'Complete' WHERE payment_id = @pay1;

-- T6 PASS. EXPECT: status Complete, confirmation_status Confirmed
CALL sp_confirm_payment(@pay1, 'TEST-CONF-001');

-- RULE 4: a Complete payment cannot be changed
-- T7 FAIL. EXPECT: ERROR 1644 A Complete or Failed payment cannot be changed
UPDATE payment SET amount = 1.00 WHERE payment_id = @pay1;

-- RULE 5: a confirmation id cannot be reused
CALL sp_process_payment(@active_lease, @active_tenant, @active_rent, 'Card');
SET @pay2 := LAST_INSERT_ID();

-- T8 FAIL. EXPECT: ERROR 1062 Duplicate entry 'TEST-CONF-001'
CALL sp_confirm_payment(@pay2, 'TEST-CONF-001');

-- RULE 6: amount must be greater than 0
-- T9 FAIL. EXPECT: ERROR 3819 Check constraint 'chk_payment_amount_positive' is violated
INSERT INTO payment (lease_id, tenant_id, amount, payment_method)
VALUES (@active_lease, @active_tenant, 0.00, 'Bank');

-- RULE 7: gateway can fail a Pending payment
-- T10 PASS. EXPECT: status Failed
CALL sp_fail_payment(@pay2);

-- T11 FAIL. EXPECT: ERROR 1644 Only a Pending payment can be marked Failed
CALL sp_fail_payment(@pay2);

-- Ledger view check. EXPECT: rows joining payment, lease, tenant and property
SELECT * FROM v_payment_ledger ORDER BY payment_id DESC LIMIT 5;

ROLLBACK;