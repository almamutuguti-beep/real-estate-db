USE real_estate_db;

CREATE TABLE maintenance_worker (
    worker_id INT UNSIGNED AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    specialty VARCHAR(50),
    CONSTRAINT pk_maintenance_worker PRIMARY KEY (worker_id),
    CONSTRAINT uq_maintenance_worker_user UNIQUE (user_id),
    CONSTRAINT fk_maintenance_worker_user FOREIGN KEY (user_id) REFERENCES user_account(user_id)
);