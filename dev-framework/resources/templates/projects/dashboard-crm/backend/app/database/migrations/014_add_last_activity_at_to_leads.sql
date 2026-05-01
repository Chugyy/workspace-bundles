-- 014_add_last_activity_at_to_leads.sql
-- Tracks last activity on a lead: notes, tasks, events INSERT/UPDATE/DELETE

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW();

-- Initialize from existing data
UPDATE leads SET last_activity_at = updated_at;

-- Trigger function
CREATE OR REPLACE FUNCTION refresh_lead_activity()
RETURNS TRIGGER AS $$
DECLARE
  target_lead_id INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_lead_id := OLD.lead_id;
  ELSE
    target_lead_id := NEW.lead_id;
  END IF;

  IF target_lead_id IS NOT NULL THEN
    UPDATE leads SET last_activity_at = NOW() WHERE id = target_lead_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger on notes
DROP TRIGGER IF EXISTS trg_notes_refresh_lead_activity ON notes;
CREATE TRIGGER trg_notes_refresh_lead_activity
  AFTER INSERT OR UPDATE OR DELETE ON notes
  FOR EACH ROW EXECUTE FUNCTION refresh_lead_activity();

-- Trigger on tasks
DROP TRIGGER IF EXISTS trg_tasks_refresh_lead_activity ON tasks;
CREATE TRIGGER trg_tasks_refresh_lead_activity
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION refresh_lead_activity();

-- Trigger on events
DROP TRIGGER IF EXISTS trg_events_refresh_lead_activity ON events;
CREATE TRIGGER trg_events_refresh_lead_activity
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION refresh_lead_activity();
