-- Migration: Ajout des colonnes deleted_at pour soft delete
-- Date: 2025-01-20
-- Description: Ajoute les colonnes deleted_at aux tables files et folders
--              pour supporter la corbeille (trash)

-- Ajouter la colonne deleted_at à la table folders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'folders' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE folders ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
        CREATE INDEX idx_folders_deleted_at ON folders(deleted_at);
    END IF;
END $$;

-- Ajouter la colonne deleted_at à la table files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'files' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE files ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL;
        CREATE INDEX idx_files_deleted_at ON files(deleted_at);
    END IF;
END $$;
