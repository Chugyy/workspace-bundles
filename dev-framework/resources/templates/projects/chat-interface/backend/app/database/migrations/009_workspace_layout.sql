-- Migration 009: Workspace layout (organizational tree, separate from workspace entities)
-- Stores a JSON tree of folders and workspace references for sidebar display.

CREATE TABLE IF NOT EXISTS workspace_layout (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default empty layout
INSERT INTO workspace_layout (tree) VALUES ('[]')
ON CONFLICT DO NOTHING;
