-- Migration 010: Remove interested field, migrate interested=true → heat_level='warm'

-- Step 1: Migrate data — interested leads become warm (only if currently cold)
UPDATE leads
SET heat_level = 'warm'
WHERE interested = TRUE AND heat_level = 'cold';

-- Step 2: Drop column
ALTER TABLE leads DROP COLUMN IF EXISTS interested;
