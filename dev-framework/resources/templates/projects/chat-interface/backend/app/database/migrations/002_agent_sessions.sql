-- Migration 002: Agent Sessions Schema
-- Tables for Claude Agent SDK session tracking

-- ============================
-- AGENT SESSIONS TABLE
-- ============================

CREATE TABLE IF NOT EXISTS agent_sessions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claude_session_id VARCHAR(255) NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'active',
    allowed_tools     TEXT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_agent_sessions_status
        CHECK (status IN ('active', 'stopped', 'completed', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_claude_session_id ON agent_sessions(claude_session_id);

-- ============================
-- AGENT MESSAGES TABLE
-- ============================

CREATE TABLE IF NOT EXISTS agent_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL,
    role            VARCHAR(20) NOT NULL,
    content         JSONB NOT NULL,
    sequence_number INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_agent_messages_session
        FOREIGN KEY (session_id)
        REFERENCES agent_sessions(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_agent_messages_role
        CHECK (role IN ('user', 'assistant', 'tool'))
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_session_id ON agent_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_session_id_sequence ON agent_messages(session_id, sequence_number);
