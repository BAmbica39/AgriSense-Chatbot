import re

import mysql.connector

import config


class DuplicateUserError(Exception):
    pass


def get_connection(with_database=True):
    params = {
        "host": config.DB_HOST,
        "port": config.DB_PORT,
        "user": config.DB_USER,
        "password": config.DB_PASSWORD,
    }
    if with_database:
        params["database"] = config.DB_NAME
    return mysql.connector.connect(**params)


def init_db():
    """Create the database and users table if they do not exist yet."""
    if not re.fullmatch(r"\w+", config.DB_NAME):
        raise ValueError("DB_NAME may only contain letters, numbers and underscores")

    conn = get_connection(with_database=False)
    cursor = conn.cursor()
    try:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{config.DB_NAME}`")
        cursor.execute(f"USE `{config.DB_NAME}`")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL
            )
            """
        )
        # The original table used VARCHAR(100), which is too short for password hashes.
        cursor.execute("ALTER TABLE users MODIFY password VARCHAR(255) NOT NULL")
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def create_user(username, name, email, password_hash):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (username, name, email, password) VALUES (%s, %s, %s, %s)",
            (username, name, email, password_hash),
        )
        conn.commit()
    except mysql.connector.IntegrityError as e:
        conn.rollback()
        raise DuplicateUserError("Username or email already exists") from e
    finally:
        cursor.close()
        conn.close()


def get_user_by_username(username):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, username, name, email, password FROM users WHERE username = %s",
            (username,),
        )
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()
