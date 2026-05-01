-- Migration 006: Add color to workspaces

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS color VARCHAR(7) NOT NULL DEFAULT '#9ca3af';
