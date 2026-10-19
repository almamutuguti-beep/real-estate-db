-- sql/04_seed/13_property_enquiry.sql
-- 4 enquiries: two New, one Responded, one Closed.
USE real_estate_db;

INSERT INTO property_enquiry (property_id, enquirer_name, enquirer_email, message, handled_by_agent_id, status) VALUES
(1, 'Grace Njeri',  'grace.njeri@example.com',  'Is the Kilimani apartment still available?',   NULL, 'New'),
(2, 'Peter Mwangi', 'peter.mwangi@example.com', 'Can I see the Westlands studio this weekend?', NULL, 'New'),
(3, 'Amina Yusuf',  'amina.yusuf@example.com',  'Are pets allowed at the Lavington townhouse?', 2,    'Responded'),
(5, 'John Kiptoo',  'john.kiptoo@example.com',  'What is the deposit for the Eastleigh flat?',  3,    'Closed');
