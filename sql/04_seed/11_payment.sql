USE real_estate_db;

SET @lease_id  := (SELECT lease_id FROM lease_agreement WHERE status = 'Active' ORDER BY lease_id LIMIT 1);
SET @tenant_id := (SELECT tenant_id FROM lease_agreement WHERE lease_id = @lease_id);
SET @rent      := (SELECT monthly_rent FROM lease_agreement WHERE lease_id = @lease_id);

SELECT @lease_id AS active_lease_used, @tenant_id AS tenant_used, @rent AS rent_used;

CALL sp_process_payment(@lease_id, @tenant_id, @rent, 'M-Pesa');
CALL sp_process_payment(@lease_id, @tenant_id, @rent, 'M-Pesa');
CALL sp_process_payment(@lease_id, @tenant_id, @rent, 'Card');
CALL sp_process_payment(@lease_id, @tenant_id, @rent, 'Bank');
CALL sp_process_payment(@lease_id, @tenant_id, @rent, 'M-Pesa');
CALL sp_process_payment(@lease_id, @tenant_id, @rent, 'Card');
CALL sp_process_payment(@lease_id, @tenant_id, @rent, 'M-Pesa');
CALL sp_process_payment(@lease_id, @tenant_id, @rent, 'Bank');
CALL sp_process_payment(@lease_id, @tenant_id, @rent, 'Card');
CALL sp_process_payment(@lease_id, @tenant_id, @rent, 'M-Pesa');

SET @last  := (SELECT MAX(payment_id) FROM payment);
SET @first := @last - 9;

CALL sp_confirm_payment(@first,     'MPESA-SEED-0001');
CALL sp_confirm_payment(@first + 1, 'MPESA-SEED-0002');
CALL sp_confirm_payment(@first + 2, 'CARD-SEED-0003');
CALL sp_confirm_payment(@first + 3, 'BANK-SEED-0004');
CALL sp_confirm_payment(@first + 4, 'MPESA-SEED-0005');
CALL sp_confirm_payment(@first + 5, 'CARD-SEED-0006');

CALL sp_fail_payment(@last);

SELECT status, COUNT(*) AS total FROM payment GROUP BY status;