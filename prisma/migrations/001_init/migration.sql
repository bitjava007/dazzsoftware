-- Dazzling Tailor ERP — Initial Migration
-- Run this on your Supabase project SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "role" AS ENUM (
  'admin', 'manager', 'accountant', 'tailor', 'user_basic'
);

CREATE TYPE "login_status" AS ENUM ('success', 'failed', 'blocked');

CREATE TYPE "order_status" AS ENUM (
  'brouillon', 'confirmee', 'mesures_prises', 'tissu_achete',
  'coupe', 'couture', 'essayage', 'retouches', 'finition',
  'pret_livraison', 'livree', 'annulee'
);

CREATE TYPE "payment_type" AS ENUM ('cash', 'mobile_money', 'bank_transfer', 'card');

CREATE TYPE "order_payment_type" AS ENUM (
  'acompte_initial', 'acompte', 'paiement_final',
  'remboursement', 'bonus', 'remise'
);

CREATE TYPE "invoice_status" AS ENUM (
  'draft', 'issued', 'partially_paid', 'paid', 'cancelled'
);

CREATE TYPE "audit_action" AS ENUM ('create', 'update', 'delete');

-- ─── Profiles ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "profiles" (
  "id"          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "full_name"   TEXT NOT NULL,
  "role"        "role" NOT NULL DEFAULT 'user_basic',
  "is_active"   BOOLEAN NOT NULL DEFAULT true,
  "avatar_url"  TEXT,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'user_basic'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Login History ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "user_login_history" (
  "id"                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"             UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "login_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "logout_at"           TIMESTAMPTZ,
  "session_duration"    INTEGER,
  "ip_address"          TEXT,
  "user_agent"          TEXT,
  "device_type"         TEXT,
  "browser"             TEXT,
  "operating_system"    TEXT,
  "country"             TEXT,
  "city"                TEXT,
  "login_status"        "login_status" NOT NULL DEFAULT 'success',
  "failure_reason"      TEXT,
  "session_id"          TEXT,
  "remember_token_used" BOOLEAN NOT NULL DEFAULT false,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Currencies ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "currencies" (
  "id"        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "code"      TEXT NOT NULL UNIQUE,
  "name"      TEXT NOT NULL,
  "symbol"    TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO "currencies" ("code", "name", "symbol") VALUES
  ('USD', 'Dollar américain', '$'),
  ('XOF', 'Franc CFA Ouest-africain', 'CFA'),
  ('EUR', 'Euro', '€'),
  ('CDF', 'Franc congolais', 'FC')
ON CONFLICT ("code") DO NOTHING;

-- ─── Exchange Rates ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "exchange_rates" (
  "id"               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "from_currency_id" UUID NOT NULL REFERENCES "currencies"("id"),
  "to_currency_id"   UUID NOT NULL REFERENCES "currencies"("id"),
  "rate"             NUMERIC(18,8) NOT NULL,
  "effective_date"   TIMESTAMPTZ NOT NULL,
  "source"           TEXT,
  "is_active"        BOOLEAN NOT NULL DEFAULT true,
  "notes"            TEXT,
  "created_by"       UUID REFERENCES "profiles"("id"),
  "updated_by"       UUID REFERENCES "profiles"("id"),
  "deleted_by"       UUID REFERENCES "profiles"("id"),
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at"       TIMESTAMPTZ
);

-- ─── Clients ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "clients" (
  "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "full_name"   TEXT NOT NULL,
  "phone"       TEXT,
  "email"       TEXT,
  "country"     TEXT,
  "city"        TEXT,
  "address"     TEXT,
  "notes"       TEXT,
  "created_by"  UUID REFERENCES "profiles"("id"),
  "updated_by"  UUID REFERENCES "profiles"("id"),
  "deleted_by"  UUID REFERENCES "profiles"("id"),
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at"  TIMESTAMPTZ
);

-- ─── Measurements ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "measurements" (
  "id"              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "client_id"       UUID NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "profile_name"    TEXT,
  "chest"           NUMERIC(6,2),
  "waist"           NUMERIC(6,2),
  "hips"            NUMERIC(6,2),
  "shoulders"       NUMERIC(6,2),
  "arm_length"      NUMERIC(6,2),
  "neck"            NUMERIC(6,2),
  "shirt_length"    NUMERIC(6,2),
  "trouser_length"  NUMERIC(6,2),
  "dress_length"    NUMERIC(6,2),
  "wrist"           NUMERIC(6,2),
  "thigh"           NUMERIC(6,2),
  "knee"            NUMERIC(6,2),
  "ankle"           NUMERIC(6,2),
  "inseam"          NUMERIC(6,2),
  "notes"           TEXT,
  "reference_photo" TEXT,
  "created_by"      UUID REFERENCES "profiles"("id"),
  "updated_by"      UUID REFERENCES "profiles"("id"),
  "deleted_by"      UUID REFERENCES "profiles"("id"),
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at"      TIMESTAMPTZ
);

-- ─── Articles ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "articles" (
  "id"               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name"             TEXT NOT NULL,
  "description"      TEXT,
  "indicative_price" NUMERIC(12,2),
  "created_by"       UUID REFERENCES "profiles"("id"),
  "updated_by"       UUID REFERENCES "profiles"("id"),
  "deleted_by"       UUID REFERENCES "profiles"("id"),
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at"       TIMESTAMPTZ
);

INSERT INTO "articles" ("name", "description", "indicative_price") VALUES
  ('Robe africaine', 'Robe traditionnelle africaine sur mesure', 150),
  ('Chemise africaine', 'Chemise en tissu wax', 80),
  ('Costume homme', 'Costume complet sur mesure', 250),
  ('Tenue de mariée', 'Robe de mariée personnalisée', 500),
  ('Boubou', 'Boubou traditionnel', 120),
  ('Pantalon sur mesure', 'Pantalon ajusté', 60)
ON CONFLICT DO NOTHING;

-- ─── Expense Categories ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "expense_categories" (
  "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name"        TEXT NOT NULL,
  "description" TEXT
);

CREATE TABLE IF NOT EXISTS "expense_subcategories" (
  "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "category_id" UUID NOT NULL REFERENCES "expense_categories"("id") ON DELETE CASCADE,
  "name"        TEXT NOT NULL,
  "description" TEXT
);

INSERT INTO "expense_categories" ("id", "name", "description") VALUES
  ('cat-mat', 'Matières premières', 'Tissu, fil, boutons, fermetures'),
  ('cat-main', 'Main d''œuvre', 'Rémunération des tailleurs'),
  ('cat-charge', 'Charges fixes', 'Loyer, électricité, eau'),
  ('cat-equip', 'Équipement', 'Machines à coudre, outils'),
  ('cat-divers', 'Divers', 'Autres dépenses')
ON CONFLICT DO NOTHING;

INSERT INTO "expense_subcategories" ("category_id", "name") VALUES
  ('cat-mat', 'Tissu'),
  ('cat-mat', 'Fil & accessoires'),
  ('cat-mat', 'Boutons & fermetures'),
  ('cat-main', 'Salaires'),
  ('cat-main', 'Freelance'),
  ('cat-charge', 'Loyer'),
  ('cat-charge', 'Électricité'),
  ('cat-charge', 'Eau'),
  ('cat-equip', 'Machine à coudre'),
  ('cat-equip', 'Entretien machines')
ON CONFLICT DO NOTHING;

-- ─── Orders ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "orders" (
  "id"                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "order_number"            TEXT NOT NULL UNIQUE,
  "client_id"               UUID NOT NULL REFERENCES "clients"("id"),
  "article_id"              UUID REFERENCES "articles"("id"),
  "measurement_id"          UUID REFERENCES "measurements"("id"),
  "country"                 TEXT,
  "city"                    TEXT,
  "order_details"           TEXT,
  "selling_price"           NUMERIC(12,2) NOT NULL,
  "currency_id"             UUID NOT NULL REFERENCES "currencies"("id"),
  "exchange_rate_used"      NUMERIC(18,8),
  "amount_usd"              NUMERIC(12,2),
  "amount_xof"              NUMERIC(12,2),
  "order_date"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expected_delivery_date"  TIMESTAMPTZ,
  "actual_delivery_date"    TIMESTAMPTZ,
  "current_status"          "order_status" NOT NULL DEFAULT 'brouillon',
  "created_by"              UUID REFERENCES "profiles"("id"),
  "updated_by"              UUID REFERENCES "profiles"("id"),
  "deleted_by"              UUID REFERENCES "profiles"("id"),
  "created_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at"              TIMESTAMPTZ
);

-- ─── Order Status History ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "order_status_history" (
  "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "order_id"    UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "old_status"  "order_status",
  "new_status"  "order_status" NOT NULL,
  "note"        TEXT,
  "changed_by"  UUID REFERENCES "profiles"("id"),
  "changed_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Expenses ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "expenses" (
  "id"                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "expense_number"    TEXT NOT NULL UNIQUE,
  "category_id"       UUID REFERENCES "expense_categories"("id"),
  "subcategory_id"    UUID REFERENCES "expense_subcategories"("id"),
  "order_id"          UUID REFERENCES "orders"("id"),
  "linked_to_order"   BOOLEAN NOT NULL DEFAULT false,
  "expense_date"      TIMESTAMPTZ NOT NULL,
  "beneficiary"       TEXT,
  "payment_type"      "payment_type" NOT NULL,
  "amount_original"   NUMERIC(12,2) NOT NULL,
  "currency_id"       UUID NOT NULL REFERENCES "currencies"("id"),
  "exchange_rate_used" NUMERIC(18,8),
  "amount_usd"        NUMERIC(12,2),
  "amount_xof"        NUMERIC(12,2),
  "label"             TEXT,
  "details"           TEXT,
  "receipt_attachment" TEXT,
  "created_by"        UUID REFERENCES "profiles"("id"),
  "updated_by"        UUID REFERENCES "profiles"("id"),
  "deleted_by"        UUID REFERENCES "profiles"("id"),
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at"        TIMESTAMPTZ
);

-- ─── Order Payments ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "order_payments" (
  "id"                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "payment_number"     TEXT NOT NULL UNIQUE,
  "receipt_number"     TEXT NOT NULL UNIQUE,
  "order_id"           UUID NOT NULL REFERENCES "orders"("id"),
  "payment_type"       "order_payment_type" NOT NULL,
  "amount_original"    NUMERIC(12,2) NOT NULL,
  "currency_id"        UUID NOT NULL REFERENCES "currencies"("id"),
  "exchange_rate_used" NUMERIC(18,8),
  "amount_usd"         NUMERIC(12,2),
  "amount_xof"         NUMERIC(12,2),
  "payment_date"       TIMESTAMPTZ NOT NULL,
  "payment_method"     "payment_type" NOT NULL,
  "payment_reference"  TEXT,
  "label"              TEXT,
  "details"            TEXT,
  "created_by"         UUID REFERENCES "profiles"("id"),
  "updated_by"         UUID REFERENCES "profiles"("id"),
  "deleted_by"         UUID REFERENCES "profiles"("id"),
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at"         TIMESTAMPTZ
);

-- ─── Invoices ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "invoices" (
  "id"                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "invoice_number"     TEXT NOT NULL UNIQUE,
  "order_id"           UUID NOT NULL REFERENCES "orders"("id"),
  "issue_date"         TIMESTAMPTZ NOT NULL,
  "due_date"           TIMESTAMPTZ,
  "total_amount"       NUMERIC(12,2) NOT NULL,
  "currency_id"        UUID NOT NULL REFERENCES "currencies"("id"),
  "exchange_rate_used" NUMERIC(18,8),
  "amount_paid"        NUMERIC(12,2) NOT NULL DEFAULT 0,
  "balance_due"        NUMERIC(12,2) NOT NULL,
  "pdf_path"           TEXT,
  "status"             "invoice_status" NOT NULL DEFAULT 'draft',
  "created_by"         UUID REFERENCES "profiles"("id"),
  "updated_by"         UUID REFERENCES "profiles"("id"),
  "deleted_by"         UUID REFERENCES "profiles"("id"),
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at"         TIMESTAMPTZ
);

-- ─── Settings ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "settings" (
  "id"                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "company_name"        TEXT NOT NULL DEFAULT 'Dazzling Tailor',
  "logo"                TEXT,
  "address"             TEXT,
  "phone"               TEXT,
  "email"               TEXT,
  "tax_number"          TEXT,
  "default_currency_id" UUID REFERENCES "currencies"("id"),
  "invoice_prefix"      TEXT NOT NULL DEFAULT 'FACT-',
  "receipt_prefix"      TEXT NOT NULL DEFAULT 'RECU-',
  "language"            TEXT NOT NULL DEFAULT 'fr',
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Audit Logs ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id"     UUID REFERENCES "profiles"("id"),
  "table_name"  TEXT NOT NULL,
  "record_id"   TEXT NOT NULL,
  "action"      "audit_action" NOT NULL,
  "old_values"  JSONB,
  "new_values"  JSONB,
  "ip_address"  TEXT,
  "user_agent"  TEXT,
  "action_date" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON clients(deleted_at);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(current_status);
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_order_id ON expenses(order_id);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses(deleted_at);
CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_deleted_at ON order_payments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_user_login_history_user_id ON user_login_history(user_id);

-- ─── Row Level Security ─────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update own
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Authenticated users can CRUD all business tables
CREATE POLICY "clients_all" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "measurements_all" ON measurements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "articles_all" ON articles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "orders_all" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "expenses_all" ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "order_payments_all" ON order_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "invoices_all" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "user_login_history_all" ON user_login_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "exchange_rates_all" ON exchange_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "settings_all" ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Updated At Trigger ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_order_payments_updated_at BEFORE UPDATE ON order_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exchange_rates_updated_at BEFORE UPDATE ON exchange_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_measurements_updated_at BEFORE UPDATE ON measurements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
