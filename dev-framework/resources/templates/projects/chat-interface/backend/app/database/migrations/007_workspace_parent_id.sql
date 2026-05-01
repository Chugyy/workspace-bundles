-- Migration 007: Add parent_id for workspace hierarchy
-- Workspaces can now have a parent workspace (flat filesystem, tree in DB)

ALTER TABLE workspaces
    ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workspaces_parent_id ON workspaces(parent_id);
