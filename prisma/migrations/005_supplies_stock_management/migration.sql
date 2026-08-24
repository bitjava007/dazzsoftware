-- Migration 005: Fournitures & Gestion de Stock
-- Run in Supabase SQL Editor

-- 1. Extend AppModule enum
ALTER TYPE app_module ADD VALUE IF NOT EXISTS 'fournitures';

-- 2. New enums
DO $$ BEGIN
  CREATE TYPE supply_unit AS ENUM ('piece','metre','centimetre','bobine','rouleau','kilogramme','gramme','litre','paquet','boite','autre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stock_movement_type AS ENUM ('entry','exit','transfer_out','transfer_in','adjustment','inventory_adjustment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE entry_status AS ENUM ('draft','validated','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE exit_destination AS ENUM ('atelier_couture','boutique','depot','autre','perte_dommage');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE exit_reason AS ENUM ('consommation_production','reparation','echantillon','perte','dommage','don','ajustement','autre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE exit_status AS ENUM ('draft','validated','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transfer_status AS ENUM ('draft','shipped','received','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE adjustment_reason AS ENUM ('erreur_saisie','perte','casse','vol','inventaire','correction_administrative','autre');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inventory_status AS ENUM ('draft','in_progress','validated','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. supply_categories
CREATE TABLE IF NOT EXISTS supply_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  phone            TEXT,
  whatsapp_number  TEXT,
  email            TEXT,
  address          TEXT,
  city             TEXT,
  country          TEXT,
  contact_name     TEXT,
  notes            TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. stock_locations
CREATE TABLE IF NOT EXISTS stock_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. supplies
CREATE TABLE IF NOT EXISTS supplies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  category_id         UUID REFERENCES supply_categories(id),
  unit                supply_unit NOT NULL,
  minimum_stock       DECIMAL(12,3) NOT NULL DEFAULT 0,
  description         TEXT,
  default_supplier_id UUID REFERENCES suppliers(id),
  reference_price     DECIMAL(12,2),
  default_location_id UUID REFERENCES stock_locations(id),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. stock_balances
CREATE TABLE IF NOT EXISTS stock_balances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_id   UUID NOT NULL REFERENCES supplies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES stock_locations(id) ON DELETE CASCADE,
  quantity    DECIMAL(12,3) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supply_id, location_id)
);

-- 8. stock_movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference        TEXT NOT NULL,
  type             stock_movement_type NOT NULL,
  supply_id        UUID NOT NULL REFERENCES supplies(id),
  quantity         DECIMAL(12,3) NOT NULL,
  unit             supply_unit NOT NULL,
  from_location_id UUID REFERENCES stock_locations(id),
  to_location_id   UUID REFERENCES stock_locations(id),
  unit_cost        DECIMAL(12,2),
  total_cost       DECIMAL(12,2),
  reason           TEXT,
  comment          TEXT,
  created_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. stock_entries
CREATE TABLE IF NOT EXISTS stock_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference        TEXT NOT NULL UNIQUE,
  date             TIMESTAMPTZ NOT NULL,
  supplier_id      UUID REFERENCES suppliers(id),
  supplier_invoice TEXT,
  location_id      UUID REFERENCES stock_locations(id),
  comment          TEXT,
  status           entry_status NOT NULL DEFAULT 'draft',
  total_amount     DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_by       UUID REFERENCES profiles(id),
  validated_by     UUID REFERENCES profiles(id),
  validated_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. stock_entry_lines
CREATE TABLE IF NOT EXISTS stock_entry_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id    UUID NOT NULL REFERENCES stock_entries(id) ON DELETE CASCADE,
  supply_id   UUID NOT NULL REFERENCES supplies(id),
  location_id UUID NOT NULL REFERENCES stock_locations(id),
  quantity    DECIMAL(12,3) NOT NULL,
  unit_cost   DECIMAL(12,2) NOT NULL,
  total_cost  DECIMAL(12,2) NOT NULL
);

-- 11. stock_exits
CREATE TABLE IF NOT EXISTS stock_exits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference     TEXT NOT NULL UNIQUE,
  date          TIMESTAMPTZ NOT NULL,
  destination   exit_destination NOT NULL,
  reason        exit_reason NOT NULL,
  external_ref  TEXT,
  comment       TEXT,
  status        exit_status NOT NULL DEFAULT 'draft',
  created_by    UUID REFERENCES profiles(id),
  validated_by  UUID REFERENCES profiles(id),
  validated_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. stock_exit_lines
CREATE TABLE IF NOT EXISTS stock_exit_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exit_id     UUID NOT NULL REFERENCES stock_exits(id) ON DELETE CASCADE,
  supply_id   UUID NOT NULL REFERENCES supplies(id),
  location_id UUID NOT NULL REFERENCES stock_locations(id),
  quantity    DECIMAL(12,3) NOT NULL
);

-- 13. stock_transfers
CREATE TABLE IF NOT EXISTS stock_transfers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference        TEXT NOT NULL UNIQUE,
  date             TIMESTAMPTZ NOT NULL,
  from_location_id UUID NOT NULL REFERENCES stock_locations(id),
  to_location_id   UUID NOT NULL REFERENCES stock_locations(id),
  comment          TEXT,
  status           transfer_status NOT NULL DEFAULT 'draft',
  created_by       UUID REFERENCES profiles(id),
  validated_by     UUID REFERENCES profiles(id),
  validated_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. stock_transfer_lines
CREATE TABLE IF NOT EXISTS stock_transfer_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  supply_id   UUID NOT NULL REFERENCES supplies(id),
  quantity    DECIMAL(12,3) NOT NULL
);

-- 15. stock_adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference   TEXT NOT NULL UNIQUE,
  date        TIMESTAMPTZ NOT NULL,
  reason      adjustment_reason NOT NULL,
  comment     TEXT,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. stock_adjustment_lines
CREATE TABLE IF NOT EXISTS stock_adjustment_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id   UUID NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
  supply_id       UUID NOT NULL REFERENCES supplies(id),
  location_id     UUID NOT NULL REFERENCES stock_locations(id),
  quantity_before DECIMAL(12,3) NOT NULL,
  quantity_after  DECIMAL(12,3) NOT NULL,
  quantity_delta  DECIMAL(12,3) NOT NULL
);

-- 17. inventory_sessions
CREATE TABLE IF NOT EXISTS inventory_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference     TEXT NOT NULL UNIQUE,
  date          TIMESTAMPTZ NOT NULL,
  location_id   UUID REFERENCES stock_locations(id),
  comment       TEXT,
  status        inventory_status NOT NULL DEFAULT 'draft',
  created_by    UUID REFERENCES profiles(id),
  validated_by  UUID REFERENCES profiles(id),
  validated_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. inventory_lines
CREATE TABLE IF NOT EXISTS inventory_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
  supply_id       UUID NOT NULL REFERENCES supplies(id),
  location_id     UUID NOT NULL REFERENCES stock_locations(id),
  theoretical_qty DECIMAL(12,3) NOT NULL,
  physical_qty    DECIMAL(12,3),
  variance        DECIMAL(12,3)
);

-- 19. Seed default locations
INSERT INTO stock_locations (name, description) VALUES
  ('Dépôt', 'Dépôt principal'),
  ('Atelier', 'Atelier de couture'),
  ('Boutique', 'Boutique')
ON CONFLICT DO NOTHING;

-- 20. Seed default categories
INSERT INTO supply_categories (name) VALUES
  ('Tissus'),
  ('Fils'),
  ('Boutons'),
  ('Fermetures'),
  ('Doublures'),
  ('Élastiques'),
  ('Entoilages'),
  ('Accessoires'),
  ('Étiquettes'),
  ('Emballages'),
  ('Autres')
ON CONFLICT DO NOTHING;
