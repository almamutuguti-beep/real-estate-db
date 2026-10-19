-- sql/01_tables/10_lease_agreement.sql
-- Needs: tenant, property, rental application

USE real_estate_db;

CREATE TABLE lease_agreement (
	lease_id INT UNSIGNED AUTO_INCREMENT,
    rental_application_id INT UNSIGNED NOT NULL,
    tenant_id INT UNSIGNED NOT NULL,
    property_id INT UNSIGNED NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Draft',
    signed_date DATE NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT pk_lease_agreement PRIMARY KEY (lease_id),
    CONSTRAINT uq_lease_application UNIQUE (rental_application_id),
    CONSTRAINT chk_lease_status CHECK (status IN ('Draft', 'Signed', 'Active', 'Ended')),
    CONSTRAINT chk_lease_dates CHECK (end_date > start_date ),
    CONSTRAINT chk_lease_rent CHECK (monthly_rent > 0),
    CONSTRAINT chk_lease_signed CHECK (status = 'Draft' OR signed_date IS NOT NULL),
    CONSTRAINT fk_lease_application FOREIGN KEY(rental_application_id)
		REFERENCES rental_application (rental_application_id),
	CONSTRAINT fk_lease_tenant FOREIGN KEY(tenant_id)
		REFERENCES tenant (tenant_id),
	CONSTRAINT fk_lease_property FOREIGN KEY(property_id)
		REFERENCES property (property_id) ON DELETE RESTRICT
    
);