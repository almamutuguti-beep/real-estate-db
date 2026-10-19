-- sql/04_seed/04_agent.sql
-- 3 agents. user_id values 10-12 must be user_account rows with role 'Agent'
-- (adjust to match the Admin's seed file).
USE real_estate_db;

INSERT INTO agent (user_id, full_name, phone, email) VALUES
(10, 'Wanjiru Kamau', '0722000001', 'wanjiru.kamau@example.com'),
(11, 'Brian Otieno',  '0722000002', 'brian.otieno@example.com'),
(12, 'Fatuma Hassan', '0722000003', 'fatuma.hassan@example.com');
