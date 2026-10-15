USE real_estate_db;

CREATE TABLE maintenance_request(
    request_id INT UNSIGNED AUTO_INCREMENT,
    property_id INT UNSIGNED NOT NULL,
    tenant_id INT UNSIGNED NOT NULL,
    assigned_to INT UNSIGNED NULL,
    description VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Open',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    CONSTRAINT pk_maintenance_request PRIMARY KEY (request_id),
    CONSTRAINT fk_maintenance_request_property FOREIGN KEY (property_id) REFERENCES property (property_id),
    CONSTRAINT fk_maintenance_request_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (tenant_id),
    CONSTRAINT fk_maintenance_request_worker FOREIGN KEY (assigned_to) REFERENCES maintenance_worker (worker_id),
    CONSTRAINT chk_maintenance_request_status CHECK (status IN('Open','Assigned','In Progress','Completed'))

);