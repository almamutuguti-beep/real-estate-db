USE real_estate_db;

CREATE TABLE payment (
    payment_id               INT UNSIGNED  AUTO_INCREMENT,
    lease_id                 INT UNSIGNED  NOT NULL,
    tenant_id                INT UNSIGNED  NOT NULL,
    amount                   DECIMAL(12,2) NOT NULL,
    payment_method           VARCHAR(20)   NOT NULL,
    gateway_confirmation_id  VARCHAR(50)   NULL,
    confirmation_status      VARCHAR(20)   NOT NULL DEFAULT 'Pending',
    status                   VARCHAR(20)   NOT NULL DEFAULT 'Pending',
    payment_date             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_payment PRIMARY KEY (payment_id),
    CONSTRAINT uq_payment_gateway_confirmation UNIQUE (gateway_confirmation_id),

    CONSTRAINT fk_payment_lease  FOREIGN KEY (lease_id)  REFERENCES lease_agreement (lease_id),
    CONSTRAINT fk_payment_tenant FOREIGN KEY (tenant_id) REFERENCES tenant (tenant_id),

    CONSTRAINT chk_payment_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_payment_method CHECK (payment_method IN ('M-Pesa', 'Card', 'Bank')),
    CONSTRAINT chk_payment_confirmation_status CHECK (confirmation_status IN ('Pending', 'Confirmed', 'Failed')),
    CONSTRAINT chk_payment_status CHECK (status IN ('Pending', 'Complete', 'Failed')),

    CONSTRAINT chk_payment_complete_needs_confirmation CHECK (
        status <> 'Complete'
        OR (gateway_confirmation_id IS NOT NULL AND confirmation_status = 'Confirmed')
    )
);