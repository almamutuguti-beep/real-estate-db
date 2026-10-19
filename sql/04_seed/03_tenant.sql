USE real_estate_db;

INSERT INTO tenant (user_id, full_name, national_id, phone, email) VALUES
(3, 'Jane Doe',   '12345678', '0712345678', 'jane@email.com'),
(4, 'John Kamau', '23456789', '0700111222', 'john@email.com');

INSERT INTO rental_application (tenant_id, property_id, application_date, status) VALUES
(1, 1, '2026-09-01', 'Approved'),
(2, 2, '2026-09-05', 'Pending');

INSERT INTO property_viewing (tenant_id, property_id, viewing_datetime, status) VALUES
(1, 1, '2026-08-25 10:00:00', 'Completed'),
(2, 2, '2026-09-02 14:00:00', 'Scheduled');