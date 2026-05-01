-- ===================================
-- Migration 008: Add 'lost' to lead status constraint
-- ===================================
-- Date: 2026-03-10

ALTER TABLE leads DROP CONSTRAINT IF EXISTS ck_leads_status;
ALTER TABLE leads ADD CONSTRAINT ck_leads_status
    CHECK (status IN ('to_contact', 'contacted', 'no_response', 'to_call_back', 'action_required', 'appointment_scheduled', 'lost'));
