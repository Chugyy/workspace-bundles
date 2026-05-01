-- ===================================
-- PostgreSQL Schema - Simple CRM
-- Migration 001: Initial Schema
-- ===================================
-- Date: 2026-02-15
-- Tables: users, leads, notes
-- Based on: docs/architecture/backend/database/schema.md
-- ===================================


-- ============================
-- 1. CREATE TABLES
-- ============================

-- TABLE: users
-- Description: CRM user accounts with authentication credentials and profile
-- Relations: 1 user → N leads (ON DELETE RESTRICT)

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


-- TABLE: leads
-- Description: CRM leads with kanban status, heat level, and contact information
-- Relations:
--   - N leads → 1 user (ON DELETE RESTRICT)
--   - 1 lead → N notes (ON DELETE CASCADE)

CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    address VARCHAR(500),
    instagram VARCHAR(255),
    linkedin VARCHAR(255),
    twitter VARCHAR(255),
    youtube VARCHAR(255),
    website VARCHAR(255),
    status VARCHAR(50) DEFAULT 'to_contact' NOT NULL,
    heat_level VARCHAR(50) DEFAULT 'cold' NOT NULL,
    interested BOOLEAN DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Foreign key constraint
    CONSTRAINT fk_leads_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    -- Unique constraint (email must be unique per user)
    CONSTRAINT uq_leads_email_user_id
        UNIQUE (email, user_id)
);


-- TABLE: notes
-- Description: Notes attached to leads with title, description, and content
-- Relations: N notes → 1 lead (ON DELETE CASCADE)

CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(500),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Foreign key constraint
    CONSTRAINT fk_notes_lead
        FOREIGN KEY (lead_id)
        REFERENCES leads(id)
        ON DELETE CASCADE
);


-- ============================
-- 2. CREATE INDEXES
-- ============================

-- INDEXES: users
-- Purpose: Login lookup, enforces uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- INDEXES: leads
-- Purpose: FK join performance (user → leads)
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);

-- Purpose: Kanban filter performance (FR27-FR31)
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Purpose: Heat level filter performance (FR28)
CREATE INDEX IF NOT EXISTS idx_leads_heat_level ON leads(heat_level);

-- Purpose: Boolean filter performance (FR29)
CREATE INDEX IF NOT EXISTS idx_leads_interested ON leads(interested);

-- Purpose: Pagination sorting performance (FR13, FR20)
CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads(updated_at DESC);

-- INDEXES: notes
-- Purpose: FK join performance (lead → notes)
CREATE INDEX IF NOT EXISTS idx_notes_lead_id ON notes(lead_id);

-- Purpose: Chronological sorting performance (FR50)
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);


-- ============================
-- 3. ADD CHECK CONSTRAINTS
-- ============================

-- CONSTRAINTS: leads
-- Purpose: Enforce valid status enum values (English snake_case)
-- Frontend maps to French: to_contact → "À contacter", contacted → "Contacté", etc.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS ck_leads_status;
ALTER TABLE leads ADD CONSTRAINT ck_leads_status
    CHECK (status IN ('to_contact', 'contacted', 'no_response', 'to_call_back', 'action_required', 'appointment_scheduled'));

-- Purpose: Enforce valid heat level enum values (English snake_case)
-- Frontend maps to French: cold → "Froid", warm → "Tiède", hot → "Chaud", very_hot → "Très chaud"
ALTER TABLE leads DROP CONSTRAINT IF EXISTS ck_leads_heat_level;
ALTER TABLE leads ADD CONSTRAINT ck_leads_heat_level
    CHECK (heat_level IN ('cold', 'warm', 'hot', 'very_hot'));

-- CONSTRAINTS: notes
-- Purpose: Prevent empty title strings
ALTER TABLE notes DROP CONSTRAINT IF EXISTS ck_notes_title_not_empty;
ALTER TABLE notes ADD CONSTRAINT ck_notes_title_not_empty
    CHECK (LENGTH(title) > 0);

-- Purpose: Prevent empty content strings
ALTER TABLE notes DROP CONSTRAINT IF EXISTS ck_notes_content_not_empty;
ALTER TABLE notes ADD CONSTRAINT ck_notes_content_not_empty
    CHECK (LENGTH(content) > 0);


-- ============================
-- 4. CREATE TRIGGERS
-- ============================

-- Purpose: Auto-update updated_at column on any UPDATE operation
-- Ensures accurate modification tracking without application-level logic

-- Trigger function (reusable for all tables)
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
DROP TRIGGER IF EXISTS set_updated_at_users ON users;
CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- Apply trigger to leads table
DROP TRIGGER IF EXISTS set_updated_at_leads ON leads;
CREATE TRIGGER set_updated_at_leads
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();

-- Apply trigger to notes table
DROP TRIGGER IF EXISTS set_updated_at_notes ON notes;
CREATE TRIGGER set_updated_at_notes
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();


-- ============================
-- MIGRATION COMPLETE
-- ============================
-- Tables created: 3 (users, leads, notes)
-- Indexes created: 8 (1 UNIQUE + 7 B-tree)
-- Foreign keys: 2 (leads.user_id → users.id, notes.lead_id → leads.id)
-- CHECK constraints: 4 (status, heat_level, title, content)
-- Triggers: 3 (auto-update updated_at for all tables)
-- ============================
