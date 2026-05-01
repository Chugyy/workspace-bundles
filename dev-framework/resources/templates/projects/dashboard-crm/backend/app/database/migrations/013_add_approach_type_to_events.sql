-- 013_add_approach_type_to_events.sql
-- Adds approach_type to events: 'first' (première approche) or 'followup' (relance)

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS approach_type VARCHAR(20)
    CHECK (approach_type IN ('first', 'followup'));
