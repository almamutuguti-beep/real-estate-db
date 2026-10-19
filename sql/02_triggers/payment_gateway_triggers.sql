USE real_estate_db;

DROP TRIGGER IF EXISTS trg_payment_before_insert;
DROP TRIGGER IF EXISTS trg_payment_before_update;

DELIMITER $$

CREATE TRIGGER trg_payment_before_insert
BEFORE INSERT ON payment
FOR EACH ROW
BEGIN
    DECLARE v_lease_status VARCHAR(20) DEFAULT NULL;
    DECLARE v_lease_tenant INT UNSIGNED DEFAULT NULL;
    DECLARE v_lease_rent   DECIMAL(12,2) DEFAULT NULL;

    SELECT status, tenant_id, monthly_rent
      INTO v_lease_status, v_lease_tenant, v_lease_rent
      FROM lease_agreement
     WHERE lease_id = NEW.lease_id;

    IF v_lease_status IS NOT NULL THEN

        IF v_lease_status <> 'Active' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'A payment can only be made against an Active lease';
        END IF;

        IF v_lease_tenant <> NEW.tenant_id THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'The tenant on the payment does not match the tenant on the lease';
        END IF;

        -- OPTIONAL (group decision 13): amount must equal the lease monthly rent.
        -- Remove the leading dashes on the next four lines if the group agrees.
        -- IF NEW.amount <> v_lease_rent THEN
        --     SIGNAL SQLSTATE '45000'
        --         SET MESSAGE_TEXT = 'The payment amount must equal the lease monthly rent';
        -- END IF;

    END IF;

    IF NEW.status <> 'Pending'
       OR NEW.confirmation_status <> 'Pending'
       OR NEW.gateway_confirmation_id IS NOT NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A new payment must start as Pending with no gateway confirmation id';
    END IF;
END$$


CREATE TRIGGER trg_payment_before_update
BEFORE UPDATE ON payment
FOR EACH ROW
BEGIN
    IF OLD.status IN ('Complete', 'Failed') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A Complete or Failed payment cannot be changed';
    END IF;

    IF NEW.lease_id <> OLD.lease_id
       OR NEW.tenant_id <> OLD.tenant_id
       OR NEW.amount <> OLD.amount THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'The lease, tenant and amount of a payment cannot be changed';
    END IF;

    IF NEW.status = 'Complete' THEN
        IF NEW.gateway_confirmation_id IS NULL OR NEW.confirmation_status <> 'Confirmed' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'A payment can only be Complete after the gateway confirms it';
        END IF;
    END IF;
END$$

DELIMITER ;