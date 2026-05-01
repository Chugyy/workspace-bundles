-- Migration 009: Refactor lead statuses + remove qualified field
-- Old statuses: to_contact, contacted, no_response, to_call_back, action_required, appointment_scheduled, lost
-- New statuses: identified, qualified, contacted, follow_up, lost, closed, onboarded, delivered, upsold

-- Step 1: Drop existing status CHECK constraint (name may vary across envs)
DO $$
DECLARE
  c_name text;
BEGIN
  SELECT conname INTO c_name
  FROM pg_constraint
  WHERE conrelid = 'leads'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';
  IF c_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE leads DROP CONSTRAINT ' || quote_ident(c_name);
  END IF;
END $$;

-- Step 2: Migrate existing status data
-- to_contact / action_required + no website → identified
UPDATE leads
SET status = 'identified'
WHERE status IN ('to_contact', 'action_required')
  AND (website IS NULL OR website = '');

-- to_contact / action_required + has website → qualified
UPDATE leads
SET status = 'qualified'
WHERE status IN ('to_contact', 'action_required')
  AND website IS NOT NULL AND website != '';

-- no_response → qualified
UPDATE leads SET status = 'qualified' WHERE status = 'no_response';

-- to_call_back + appointment_scheduled → follow_up
UPDATE leads SET status = 'follow_up' WHERE status IN ('to_call_back', 'appointment_scheduled');

-- contacted → contacted (no change)
-- lost → lost (no change)

-- Step 3: Add new CHECK constraint
ALTER TABLE leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('identified', 'qualified', 'contacted', 'follow_up', 'lost', 'closed', 'onboarded', 'delivered', 'upsold'));

-- Step 4: Remove qualified boolean column and its index
DROP INDEX IF EXISTS idx_leads_qualified;
ALTER TABLE leads DROP COLUMN IF EXISTS qualified;
