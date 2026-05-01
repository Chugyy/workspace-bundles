-- Migration 005: Workspaces + Claude Profiles

-- ============================
-- CLAUDE PROFILES
-- ============================

CREATE TABLE IF NOT EXISTS claude_profiles (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL UNIQUE,  -- = nom du dossier dans /profiles/
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claude_profiles_name ON claude_profiles(name);

-- ============================
-- WORKSPACES
-- ============================

CREATE TABLE IF NOT EXISTS workspaces (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255) NOT NULL UNIQUE,  -- = nom du dossier dans /workspaces/
    claude_profile_id UUID REFERENCES claude_profiles(id) ON DELETE SET NULL,
    included_items    JSONB NOT NULL DEFAULT '[]',   -- items du profil activés
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_name ON workspaces(name);
CREATE INDEX IF NOT EXISTS idx_workspaces_profile_id ON workspaces(claude_profile_id);

-- ============================
-- AGENT SESSIONS → WORKSPACE FK
-- ============================

ALTER TABLE agent_sessions
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agent_sessions_workspace_id ON agent_sessions(workspace_id);
