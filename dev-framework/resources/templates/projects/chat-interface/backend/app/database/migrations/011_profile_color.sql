-- Migration 011: Add color to claude_profiles
ALTER TABLE claude_profiles ADD COLUMN IF NOT EXISTS color VARCHAR(7) NOT NULL DEFAULT '#9ca3af';
