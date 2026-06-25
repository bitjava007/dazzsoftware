-- Migration 004: Dynamic Branding
-- Adds app-wide branding fields (name, favicon, contact details, theme colors)
-- to the settings table so the visual identity is configurable without code
-- changes. Existing rows are backfilled; no data is lost.

-- 1. Identity columns
ALTER TABLE settings ADD COLUMN IF NOT EXISTS app_name VARCHAR(255) NOT NULL DEFAULT 'DazzUrembo App';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS favicon TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS city VARCHAR(255);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS country VARCHAR(255);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS slogan VARCHAR(255);

-- 2. Theme color columns (hex strings, defaults match the app's existing
--    hardcoded blue-600 / slate-900 visual identity so nothing changes
--    visually for installs that haven't customized colors yet)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) NOT NULL DEFAULT '#2563eb';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) NOT NULL DEFAULT '#0f172a';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS button_color VARCHAR(7) NOT NULL DEFAULT '#2563eb';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS sidebar_color VARCHAR(7) NOT NULL DEFAULT '#0f172a';

-- 3. Backfill: any row still carrying the old hardcoded placeholder company
--    name is migrated to the new official app name, without touching rows
--    where an operator already set a real company name.
UPDATE settings SET company_name = 'DazzUrembo App' WHERE company_name = 'Dazzling Tailor';
UPDATE settings SET app_name = 'DazzUrembo App' WHERE app_name IS NULL OR app_name = '';
