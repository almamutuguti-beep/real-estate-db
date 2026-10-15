-- sql/01_tables/04_agent.sql
-- Owner: Agent. Needs: user_account
-- Login data (username, password, is_verified) lives in user_account, not here.
USE real_estate_db;

CREATE TABLE agent (
    agent_id  INT UNSIGNED AUTO_INCREMENT,
    user_id   INT UNSIGNED NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone     VARCHAR(20),
    email     VARCHAR(100) NOT NULL,
    CONSTRAINT pk_agent PRIMARY KEY (agent_id),
    CONSTRAINT uq_agent_user UNIQUE (user_id),
    CONSTRAINT uq_agent_email UNIQUE (email),
    CONSTRAINT fk_agent_user FOREIGN KEY (user_id)
        REFERENCES user_account (user_id)
);
