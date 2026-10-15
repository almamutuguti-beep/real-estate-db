-- sql/01_tables/13_property_enquiry.sql
-- Owner: Agent. Needs: property, agent
-- Enquiries come from the public, so there is no tenant key here.
USE real_estate_db;

CREATE TABLE property_enquiry (
    enquiry_id          INT UNSIGNED AUTO_INCREMENT,
    property_id         INT UNSIGNED NOT NULL,
    enquirer_name       VARCHAR(100) NOT NULL,
    enquirer_email      VARCHAR(100) NOT NULL,
    message             TEXT         NOT NULL,
    handled_by_agent_id INT UNSIGNED NULL,
    status              VARCHAR(20)  NOT NULL DEFAULT 'New',
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_property_enquiry PRIMARY KEY (enquiry_id),
    CONSTRAINT chk_property_enquiry_status
        CHECK (status IN ('New','Responded','Closed')),
    CONSTRAINT fk_property_enquiry_property FOREIGN KEY (property_id)
        REFERENCES property (property_id),
    CONSTRAINT fk_property_enquiry_agent FOREIGN KEY (handled_by_agent_id)
        REFERENCES agent (agent_id)
);
