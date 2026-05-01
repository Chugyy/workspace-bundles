-- Migration: Ajouter storage_limit à la table users
-- Par défaut: 50 GB (53687091200 bytes)

ALTER TABLE users ADD COLUMN storage_limit BIGINT DEFAULT 53687091200;
