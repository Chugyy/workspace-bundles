-- Migration: Ajout des colonnes is_favorite
-- Date: 2025-01-20
-- Description: Ajoute les colonnes is_favorite aux tables files et folders

-- Ajouter la colonne is_favorite à la table folders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'folders' AND column_name = 'is_favorite'
    ) THEN
        ALTER TABLE folders ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE NOT NULL;
        CREATE INDEX idx_folders_is_favorite ON folders(is_favorite);
    END IF;
END $$;

-- Ajouter la colonne is_favorite à la table files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'files' AND column_name = 'is_favorite'
    ) THEN
        ALTER TABLE files ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE NOT NULL;
        CREATE INDEX idx_files_is_favorite ON files(is_favorite);
    END IF;
END $$;
