USE real_estate_db;

CREATE TABLE property_owner (
    property_owner_id INT UNSIGNED
    AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    company_name VARCHAR(100),
    phone VARCHAR(15),
    email VARCHAR(100) UNIQUE,
    db_user VARCHAR(100) UNIQUE,
    create_date DATETIME DEFAULT 
    CURRENT_TIMESTAMP,
    PRIMARY KEY pk_propert_owner (property_owner_id),
    FOREIGN KEY fk_property_owner_user (user_id)
    REFERENCES user_account (user_id),
    UNIQUE uq_property_owner_email (email)
);
