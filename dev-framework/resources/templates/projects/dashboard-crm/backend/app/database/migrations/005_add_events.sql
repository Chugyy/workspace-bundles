-- ===================================
-- Migration 005: Add events table
-- ===================================
-- Date: 2026-03-04
-- Tables: events
-- Represents past interactions and future planned reminders
-- ===================================


-- ============================
-- 1. CREATE TABLE
-- ============================

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    lead_id INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL DEFAULT 'other',
    event_date TIMESTAMP NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_events_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_events_lead
        FOREIGN KEY (lead_id)
        REFERENCES leads(id)
        ON DELETE SET NULL
);


-- ============================
-- 2. CREATE INDEXES
-- ============================

CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_lead_id ON events(lead_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date ASC);
CREATE INDEX IF NOT EXISTS idx_events_is_completed ON events(is_completed);


-- ============================
-- 3. ADD CHECK CONSTRAINTS
-- ============================

ALTER TABLE events DROP CONSTRAINT IF EXISTS ck_events_event_type;
ALTER TABLE events ADD CONSTRAINT ck_events_event_type
    CHECK (event_type IN ('call', 'email', 'meeting', 'followup', 'other'));

ALTER TABLE events DROP CONSTRAINT IF EXISTS ck_events_title_not_empty;
ALTER TABLE events ADD CONSTRAINT ck_events_title_not_empty
    CHECK (LENGTH(title) > 0);


-- ============================
-- 4. CREATE TRIGGER
-- ============================

DROP TRIGGER IF EXISTS set_updated_at_events ON events;
CREATE TRIGGER set_updated_at_events
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();


-- ============================
-- MIGRATION COMPLETE
-- ============================
-- Tables created: 1 (events)
-- Indexes created: 4
-- Foreign keys: 2 (user_id → users.id RESTRICT, lead_id → leads.id SET NULL)
-- CHECK constraints: 2 (event_type, title)
-- Triggers: 1
-- ============================
