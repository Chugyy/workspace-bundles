-- ===================================
-- PostgreSQL Schema - Simple CRM
-- Migration 003: Make email optional
-- ===================================
-- Date: 2026-02-15
-- Tables: leads
-- Reason: Allow leads without email addresses
-- ===================================

-- ============================
-- 1. DROP UNIQUE CONSTRAINT
-- ============================

-- Remove the existing UNIQUE constraint on (email, user_id)
-- We'll recreate it as a partial unique index that ignores NULL emails
ALTER TABLE leads DROP CONSTRAINT IF EXISTS uq_leads_email_user_id;


-- ============================
-- 2. MAKE EMAIL NULLABLE
-- ============================

-- Allow NULL values for email column
ALTER TABLE leads ALTER COLUMN email DROP NOT NULL;


-- ============================
-- 3. CREATE PARTIAL UNIQUE INDEX
-- ============================

-- Create a partial unique index that only enforces uniqueness when email is NOT NULL
-- This allows multiple leads with NULL emails for the same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_user_id_unique
    ON leads(email, user_id)
    WHERE email IS NOT NULL;


-- ============================
-- MIGRATION COMPLETE
-- ============================
-- Changes:
-- - email column is now nullable
-- - UNIQUE constraint replaced with partial unique index
-- - Multiple NULL emails allowed per user
-- - Non-NULL emails still enforced unique per user
-- ============================
