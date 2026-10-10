-- sql/00_setup/create_database.sql
-- creates the empty group database. Safe to run more than once

CREATE DATABASE IF NOT EXISTS real_estate_db
	CHARACTER SET utf8mb4;
    
USE real_estate_db;