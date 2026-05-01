-- Migration 008: Track who initiated each session (human or agent)
-- Value format: "human" or "agent:<workspace_name>"

ALTER TABLE agent_sessions
    ADD COLUMN IF NOT EXISTS initiated_by VARCHAR(255) NOT NULL DEFAULT 'human';
