USE real_estate_db;

DROP PROCEDURE IF EXISTS sp_process_payment;
DROP PROCEDURE IF EXISTS sp_confirm_payment;
DROP PROCEDURE IF EXISTS sp_fail_payment;

DELIMITER $$

CREATE PROCEDURE sp_process_payment(
    IN p_lease_id  INT UNSIGNED,
    IN p_tenant_id INT UNSIGNED,
    IN p_amount    DECIMAL(12,2),
    IN p_method    VARCHAR(20)
)
BEGIN
    INSERT INTO payment (lease_id, tenant_id, amount, payment_method)
    VALUES (p_lease_id, p_tenant_id, p_amount, p_method);

    SELECT LAST_INSERT_ID() AS payment_id, 'Pending' AS status;
END$$


CREATE PROCEDURE sp_confirm_payment(
    IN p_payment_id  INT UNSIGNED,
    IN p_gateway_ref VARCHAR(50)
)
BEGIN
    DECLARE v_status VARCHAR(20) DEFAULT NULL;

    SELECT status INTO v_status FROM payment WHERE payment_id = p_payment_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payment not found';
    END IF;

    IF v_status <> 'Pending' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only a Pending payment can be confirmed';
    END IF;

    IF p_gateway_ref IS NULL OR TRIM(p_gateway_ref) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A gateway confirmation reference is required';
    END IF;

    UPDATE payment
       SET gateway_confirmation_id = p_gateway_ref,
           confirmation_status     = 'Confirmed',
           status                  = 'Complete'
     WHERE payment_id = p_payment_id;

    SELECT payment_id, status, confirmation_status, gateway_confirmation_id
      FROM payment
     WHERE payment_id = p_payment_id;
END$$


CREATE PROCEDURE sp_fail_payment(
    IN p_payment_id INT UNSIGNED
)
BEGIN
    DECLARE v_status VARCHAR(20) DEFAULT NULL;

    SELECT status INTO v_status FROM payment WHERE payment_id = p_payment_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payment not found';
    END IF;

    IF v_status <> 'Pending' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only a Pending payment can be marked Failed';
    END IF;

    UPDATE payment
       SET confirmation_status = 'Failed',
           status              = 'Failed'
     WHERE payment_id = p_payment_id;

    SELECT payment_id, status, confirmation_status
      FROM payment
     WHERE payment_id = p_payment_id;
END$$

DELIMITER ;   