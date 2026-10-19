-- Test Owners referenced by owner seed
INSERT INTO user_account (username, password_hash, role, is_verified, is_active) VALUES
	('owner1', '<hash>', 'Owner', TRUE, TRUE),
    ('owner2', '<hash>', 'Owner', TRUE, TRUE),
    ('owner3', '<hash>', 'Owner', TRUE, TRUE),
    ('owner4', '<hash>', 'Owner', TRUE, TRUE);