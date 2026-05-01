-- Migration 015: Reassign qualified leads without notes back to identified
-- Rationale: a qualified lead must have at least one note documenting the qualification.
-- 47 leads affected (qualified + no notes → identified).

UPDATE leads
SET status = 'identified'
WHERE status = 'qualified'
  AND NOT EXISTS (
    SELECT 1 FROM notes WHERE lead_id = leads.id
  );

-- Re-apply rule from migration 011: identified leads must have cold heat_level
UPDATE leads
SET heat_level = 'cold'
WHERE status = 'identified'
  AND heat_level != 'cold';
