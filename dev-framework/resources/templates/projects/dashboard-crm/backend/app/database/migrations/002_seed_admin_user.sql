-- Seed: Admin User
-- Generated: 2026-02-15T09:37:10.030364
-- Email: admin@admin.admin
-- Password: admin123
-- ⚠️ This file is auto-applied by run_pending_migrations() at backend startup

INSERT INTO users (email, hashed_password, name, created_at, updated_at)
VALUES (
  'admin@admin.admin',
  '$2b$12$P11e9CoqhZcmZEd3Y7ZrousvTx6tyUT7rANWhwBsLVoT4HpT/Dhde',
  'Admin User',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
