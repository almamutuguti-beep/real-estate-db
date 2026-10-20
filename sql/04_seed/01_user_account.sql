-- Test Owners referenced by owner seed

USE real_estate_db;

INSERT INTO user_account (username, password_hash, role, is_verified, is_active) VALUES
	('owner1', '$2b$10$9p.6RnDimuhC8N7YIZ5oWe4aOXKAMtLirjVIIyXkgR1nJ.8IXVQg.', 'Owner', TRUE, TRUE),
    ('owner2', '$2b$10$9p.6RnDimuhC8N7YIZ5oWe4aOXKAMtLirjVIIyXkgR1nJ.8IXVQg.', 'Owner', TRUE, TRUE),
    ('owner3', '$2b$10$9p.6RnDimuhC8N7YIZ5oWe4aOXKAMtLirjVIIyXkgR1nJ.8IXVQg.', 'Owner', TRUE, TRUE),
    ('owner4', '$2b$10$9p.6RnDimuhC8N7YIZ5oWe4aOXKAMtLirjVIIyXkgR1nJ.8IXVQg.', 'Owner', TRUE, TRUE);