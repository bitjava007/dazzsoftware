-- Dazzling Tailor ERP — Migration 003: Invoice Refactor
-- Adds multi-order invoice support while preserving existing data.

-- 1. Add client_id column (nullable first for backfill)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_id UUID;

-- 2. Backfill client_id from orders
UPDATE invoices i
SET client_id = o.client_id
FROM orders o
WHERE i.order_id = o.id
  AND i.client_id IS NULL;

-- 3. Make client_id NOT NULL (safe after backfill; new installs already have no rows)
ALTER TABLE invoices ALTER COLUMN client_id SET NOT NULL;

-- 4. Make order_id nullable (previously required)
ALTER TABLE invoices ALTER COLUMN order_id DROP NOT NULL;

-- 5. Add financial breakdown columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bonus    DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes    TEXT;

-- 6. Backfill subtotal from total_amount for existing rows
UPDATE invoices SET subtotal = total_amount WHERE subtotal = 0;

-- 7. Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  order_id    UUID        NOT NULL REFERENCES orders(id),
  amount      DECIMAL(12,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Backfill invoice_items from existing invoices (one item per old invoice)
INSERT INTO invoice_items (invoice_id, order_id, amount)
SELECT id, order_id, total_amount
FROM invoices
WHERE order_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = invoices.id
  );

-- 9. Foreign key: invoices.client_id → clients.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_client_id_fkey'
  ) THEN
    ALTER TABLE invoices
      ADD CONSTRAINT invoices_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES clients(id);
  END IF;
END$$;
