-- ===================================
-- Migration 004: Add city column to leads
-- ===================================
-- Date: 2026-03-02
-- Adds city (VARCHAR 255, nullable) to leads table
-- Seeds all existing leads with 'chartres'
-- ===================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS city VARCHAR(255);

UPDATE leads SET city = 'chartres' WHERE city IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
