CREATE TABLE property_owner (
    property_owner_id INT UNSIGNED
    AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    company_name VARCHAR(100),
    phone VARCHAR(15),
    email VARCHAR(100) UNIQUE,
    create_date DATETIME DEFAULT 
    CURRENT_TIMESTAMP,
    PRIMARY KEY pk_propert_owner (property_owner_id),
    FOREIGN KEY fk_property_owner_user (user_id)
    REFERENCES user_account (user_id),
    UNIQUE uq_property_owner_email (email)
);

CREATE TABLE property (
    property_id INT UNSIGNED
    AUTO_INCREMENT,
    property_owner_id INT UNSIGNED NOT NULL,
    address VARCHAR(255) NOT NULL,
    property_type VARCHAR(50),
    bedrooms INT,
    bathrooms INT,
    monthly_rent DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'Available' CHECK (status IN ('Available', 'Rented', 'Removed')),
    create_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY pk_property (property_id),
    FOREIGN KEY fk_property_owner (property_owner_id)
    REFERENCES property_owner(property_owner_id) ON DELETE RESTRICT
);