USE real_estate_db;

CREATE TABLE tenant (
    tenant_id       INT UNSIGNED AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    national_id     VARCHAR(20)  NOT NULL,
    phone           VARCHAR(15)  NOT NULL,
    email           VARCHAR(100) NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_tenant PRIMARY KEY (tenant_id),
    CONSTRAINT uq_tenant_user UNIQUE (user_id),
    CONSTRAINT uq_tenant_national_id UNIQUE (national_id),
    CONSTRAINT uq_tenant_email UNIQUE (email),
    CONSTRAINT fk_tenant_user FOREIGN KEY (user_id) REFERENCES user_account (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE rental_application (
    rental_application_id INT UNSIGNED AUTO_INCREMENT,
    tenant_id             INT UNSIGNED NOT NULL,
    property_id           INT UNSIGNED NOT NULL,
    application_date      DATE NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'Pending',
    CONSTRAINT pk_rental_application PRIMARY KEY (rental_application_id),
    CONSTRAINT chk_application_status
        CHECK (status IN ('Pending','Approved','Rejected')),
    CONSTRAINT fk_application_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (tenant_id),
    CONSTRAINT fk_application_property
        FOREIGN KEY (property_id) REFERENCES property (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE property_viewing (
    property_viewing_id INT UNSIGNED AUTO_INCREMENT,
    tenant_id           INT UNSIGNED NOT NULL,
    property_id         INT UNSIGNED NOT NULL,
    viewing_datetime    DATETIME NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
    CONSTRAINT pk_property_viewing PRIMARY KEY (property_viewing_id),
    CONSTRAINT chk_viewing_status
        CHECK (status IN ('Scheduled','Completed','Cancelled')),
    CONSTRAINT fk_viewing_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenant (tenant_id),
    CONSTRAINT fk_viewing_property
        FOREIGN KEY (property_id) REFERENCES property (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
