-- Migration 012: Remove note description + make content optional

-- Step 1: Merge description into content
UPDATE notes
SET content = description || E'\n--\n' || content
WHERE description IS NOT NULL AND description != '';

ALTER TABLE notes DROP COLUMN IF EXISTS description;

-- Step 2: Make content nullable (was NOT NULL)
ALTER TABLE notes DROP CONSTRAINT IF EXISTS ck_notes_content_not_empty;
ALTER TABLE notes ALTER COLUMN content DROP NOT NULL;
