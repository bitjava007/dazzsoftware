-- Migration 002: QA Fixes & New Features
-- Safe additive migration — run in Supabase SQL Editor

-- ─── 1. Article Types ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "article_types" (
  "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "created_by"  UUID REFERENCES "profiles"("id"),
  "updated_by"  UUID REFERENCES "profiles"("id"),
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_article_types_updated_at
  BEFORE UPDATE ON article_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO "article_types" ("name", "description") VALUES
  ('Vêtements', 'Tenues et habits sur mesure'),
  ('Chaussures', 'Chaussures artisanales'),
  ('Sacs à main', 'Maroquinerie'),
  ('Accessoires', 'Ceintures, foulards, bijoux'),
  ('Bijoux', 'Bijoux artisanaux'),
  ('Autres', 'Autres articles')
ON CONFLICT DO NOTHING;

ALTER TABLE "article_types" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "article_types_all" ON article_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 2. Update Articles ───────────────────────────────────────────────────────

ALTER TABLE "articles"
  ADD COLUMN IF NOT EXISTS "article_type_id" UUID REFERENCES "article_types"("id"),
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- ─── 3. Order Lines ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "order_lines" (
  "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "order_id"    UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "article_id"  UUID REFERENCES "articles"("id"),
  "description" TEXT,
  "quantity"    INTEGER NOT NULL DEFAULT 1,
  "unit_price"  NUMERIC(12,2) NOT NULL,
  "line_total"  NUMERIC(12,2) NOT NULL,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_order_lines_updated_at
  BEFORE UPDATE ON order_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_order_lines_order_id ON order_lines(order_id);

ALTER TABLE "order_lines" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_lines_all" ON order_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 4. Update Orders ─────────────────────────────────────────────────────────

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "subtotal"  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discount"  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bonus"     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "notes"     TEXT;

-- Set subtotal = selling_price for existing orders (backward compat)
UPDATE "orders" SET "subtotal" = "selling_price" WHERE "subtotal" = 0 AND "selling_price" > 0;

-- Migrate existing orders to order_lines (one line per order with article)
INSERT INTO "order_lines" ("order_id", "article_id", "description", "quantity", "unit_price", "line_total")
SELECT
  o."id",
  o."article_id",
  COALESCE(a."name", 'Article sans nom'),
  1,
  o."selling_price",
  o."selling_price"
FROM "orders" o
LEFT JOIN "articles" a ON o."article_id" = a."id"
WHERE o."deleted_at" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "order_lines" ol WHERE ol."order_id" = o."id"
  );

-- ─── 5. Measurements: add custom_measurements ────────────────────────────────

ALTER TABLE "measurements"
  ADD COLUMN IF NOT EXISTS "custom_measurements" JSONB;

-- ─── 6. Payment methods: add wave, orange_money ──────────────────────────────

ALTER TYPE "payment_type" ADD VALUE IF NOT EXISTS 'wave';
ALTER TYPE "payment_type" ADD VALUE IF NOT EXISTS 'orange_money';

-- ─── 7. Audit logs: add entity_type alias columns ────────────────────────────
-- (audit_logs already exists, no changes needed)

-- ─── 8. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_article_types_active ON article_types(is_active);
CREATE INDEX IF NOT EXISTS idx_articles_type_id ON articles(article_type_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_date ON orders(client_id, order_date);
