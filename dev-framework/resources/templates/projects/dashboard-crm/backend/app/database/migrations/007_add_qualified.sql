-- ===================================
-- Migration 007: Add qualified field + data migration
-- ===================================
-- Date: 2026-03-10
-- Changes:
--   1. Add qualified BOOLEAN column (DEFAULT FALSE)
--   2. Migrate warm leads → cold + qualified = TRUE
--   3. Auto-qualify leads with ≥2 contact info AND business data
-- ===================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualified BOOLEAN NOT NULL DEFAULT FALSE;

-- Warm leads → cold + qualified (no warm leads should remain after this)
UPDATE leads SET heat_level = 'cold', qualified = TRUE WHERE heat_level = 'warm';

-- Auto-qualify leads: ≥2 of (email, phone, website) AND (ca IS NOT NULL OR effectifs IS NOT NULL)
UPDATE leads
SET qualified = TRUE
WHERE qualified = FALSE
AND (
    (CASE WHEN email   IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN phone   IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN website IS NOT NULL THEN 1 ELSE 0 END) >= 2
)
AND (ca IS NOT NULL OR effectifs IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_leads_qualified ON leads(qualified);
