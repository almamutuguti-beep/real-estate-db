USE real_estate_db;

CREATE TABLE rental_application (
    rental_application_id INT UNSIGNED AUTO_INCREMENT,
    tenant_id             INT UNSIGNED NOT NULL,
    property_id           INT UNSIGNED NOT NULL,
    application_date      DATE NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'Pending',
    CONSTRAINT pk_rental_application PRIMARY KEY (rental_application_id),
    CONSTRAINT chk_application_status CHECK (status IN ('Pending','Approved','Rejected')),
    CONSTRAINT fk_application_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (tenant_id),
    CONSTRAINT fk_application_property FOREIGN KEY (property_id) REFERENCES property (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;