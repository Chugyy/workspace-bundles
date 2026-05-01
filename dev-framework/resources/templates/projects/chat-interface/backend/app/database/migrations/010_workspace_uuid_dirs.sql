-- Migration 010: Workspace directories are now named by UUID, not by name.
-- name is purely a display label, duplicates are allowed.

ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_name_key;
