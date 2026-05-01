-- Migration 006: Add applied_at to workspaces

ALTER TABLE workspaces
    ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP NULL;
