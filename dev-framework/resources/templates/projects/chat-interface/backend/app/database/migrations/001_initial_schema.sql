-- Migration 001: Initial Schema (Template)
-- This file will be REPLACED by generate-database-models agent during Phase 2.1
-- Creates base tables for the application

-- ============================
-- USERS TABLE
-- ============================

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL,

    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- ============================
-- PASSWORD RESET TOKENS TABLE
-- ============================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    is_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_password_reset_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

-- ============================
-- IMPORTANT NOTE
-- ============================
-- This template migration contains basic schema for demonstration.
-- During Phase 2.1 of /greenfield:6-create-infrastructure, the
-- generate-database-models agent will:
-- 1. Read docs/architecture/schema.md
-- 2. REPLACE this entire file with proper schema
-- 3. Also update app/database/models.py with SQLAlchemy models
--
-- Do NOT manually edit this file if you plan to use the agent.
