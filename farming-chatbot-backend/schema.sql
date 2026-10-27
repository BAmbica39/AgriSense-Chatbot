-- The backend creates this automatically on startup.
-- This file is for reference or manual setup.
CREATE DATABASE IF NOT EXISTS chatbot_users;
USE chatbot_users;

CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL  -- PBKDF2 hash, never plaintext
);
