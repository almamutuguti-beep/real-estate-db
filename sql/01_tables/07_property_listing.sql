-- sql/01_tables/07_property_listing.sql
-- Owner: Agent. Needs: property, agent
-- The "agent must be assigned to the property" rule is a trigger (02_triggers/agent_triggers.sql).
USE real_estate_db;

CREATE TABLE property_listing (
    listing_id     INT UNSIGNED AUTO_INCREMENT,
    property_id    INT UNSIGNED NOT NULL,
    agent_id       INT UNSIGNED NOT NULL,
    description    TEXT,
    listing_status VARCHAR(20)  NOT NULL DEFAULT 'Draft',
    listed_date    DATE         NOT NULL DEFAULT (CURRENT_DATE),
    CONSTRAINT pk_property_listing PRIMARY KEY (listing_id),
    CONSTRAINT chk_property_listing_status
        CHECK (listing_status IN ('Draft','Published','Closed')),
    CONSTRAINT fk_property_listing_property FOREIGN KEY (property_id)
        REFERENCES property (property_id),
    CONSTRAINT fk_property_listing_agent FOREIGN KEY (agent_id)
        REFERENCES agent (agent_id)
);
