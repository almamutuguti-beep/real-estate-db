USE real_estate_db;

INSERT INTO maintenance_worker (user_id,full_name,phone,specialty)VALUES
((SELECT user_id FROM user_account WHERE username = 'worker1'), 'Alma Wanjiru', '0795967572','Plumbing'),
((SELECT user_id FROM user_account WHERE username = 'worker2'),'Gabriel Analoh', '0795967573', 'Electrical'),
((SELECT user_id FROM user_account WHERE username = 'worker3'), 'Jeremy Njuguna', '0740129619', 'General repairs');