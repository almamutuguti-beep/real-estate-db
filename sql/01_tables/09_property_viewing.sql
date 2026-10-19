USE real_estate_db;

CREATE TABLE property_viewing (
    property_viewing_id INT UNSIGNED AUTO_INCREMENT,
    tenant_id           INT UNSIGNED NOT NULL,
    property_id         INT UNSIGNED NOT NULL,
    viewing_datetime    DATETIME NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
    CONSTRAINT pk_property_viewing PRIMARY KEY (property_viewing_id),
    CONSTRAINT chk_viewing_status CHECK (status IN ('Scheduled','Completed','Cancelled')),
    CONSTRAINT fk_viewing_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (tenant_id),
    CONSTRAINT fk_viewing_property FOREIGN KEY (property_id) REFERENCES property (property_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
