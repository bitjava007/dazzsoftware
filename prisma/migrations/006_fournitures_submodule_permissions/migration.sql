-- Migration 006: Fournitures sub-module permissions
-- Extends the app_module enum with independent sub-modules for each
-- Fournitures & Stock functionality. Each sub-module has its own
-- canView / canCreate / canEdit / canDelete permissions.

DO $$ BEGIN
  ALTER TYPE app_module ADD VALUE IF NOT EXISTS 'fournitures_entrees';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE app_module ADD VALUE IF NOT EXISTS 'fournitures_sorties';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE app_module ADD VALUE IF NOT EXISTS 'fournitures_transferts';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE app_module ADD VALUE IF NOT EXISTS 'fournitures_inventaire';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE app_module ADD VALUE IF NOT EXISTS 'fournitures_ajustements';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE app_module ADD VALUE IF NOT EXISTS 'fournitures_etat_stock';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE app_module ADD VALUE IF NOT EXISTS 'fournitures_historique';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE app_module ADD VALUE IF NOT EXISTS 'fournitures_fournisseurs';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE app_module ADD VALUE IF NOT EXISTS 'fournitures_emplacements';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
