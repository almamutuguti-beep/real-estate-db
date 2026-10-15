-- sql/01_tables/01_user_account.sql
-- Login table for every role in the system

USE real_estate_db;

CREATE TABLE user_account (
	user_id INT UNSIGNED AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
	password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_user_account PRIMARY KEY (user_id),
    CONSTRAINT uq_user_account_username UNIQUE (username),
    CONSTRAINT chk_user_account_role 
		CHECK (role IN ("Admin", "Owner", "Tenant", "Agent", "Worker")),
	CONSTRAINT fk_user_account_created_by
		FOREIGN KEY (created_by) REFERENCES user_account (user_id)
    
);