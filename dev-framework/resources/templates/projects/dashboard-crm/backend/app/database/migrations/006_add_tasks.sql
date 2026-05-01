-- ===================================
-- Migration 006: Add tasks table
-- ===================================
-- Date: 2026-03-04
-- Tables: tasks
-- Represents actionable to-dos, optionally linked to a lead
-- ===================================


-- ============================
-- 1. CREATE TABLE
-- ============================

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    lead_id INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'commercial',
    status VARCHAR(50) NOT NULL DEFAULT 'todo',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_tasks_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_tasks_lead
        FOREIGN KEY (lead_id)
        REFERENCES leads(id)
        ON DELETE SET NULL
);


-- ============================
-- 2. CREATE INDEXES
-- ============================

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date ASC);


-- ============================
-- 3. ADD CHECK CONSTRAINTS
-- ============================

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ck_tasks_category;
ALTER TABLE tasks ADD CONSTRAINT ck_tasks_category
    CHECK (category IN ('commercial', 'delivery'));

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ck_tasks_status;
ALTER TABLE tasks ADD CONSTRAINT ck_tasks_status
    CHECK (status IN ('todo', 'in_progress', 'done'));

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ck_tasks_priority;
ALTER TABLE tasks ADD CONSTRAINT ck_tasks_priority
    CHECK (priority IN ('low', 'medium', 'high'));

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ck_tasks_title_not_empty;
ALTER TABLE tasks ADD CONSTRAINT ck_tasks_title_not_empty
    CHECK (LENGTH(title) > 0);


-- ============================
-- 4. CREATE TRIGGER
-- ============================

DROP TRIGGER IF EXISTS set_updated_at_tasks ON tasks;
CREATE TRIGGER set_updated_at_tasks
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();


-- ============================
-- MIGRATION COMPLETE
-- ============================
-- Tables created: 1 (tasks)
-- Indexes created: 5
-- Foreign keys: 2 (user_id → users.id RESTRICT, lead_id → leads.id SET NULL)
-- CHECK constraints: 4 (category, status, priority, title)
-- Triggers: 1
-- ============================
