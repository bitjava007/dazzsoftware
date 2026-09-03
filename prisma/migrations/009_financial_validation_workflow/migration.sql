-- Migration 009: Maker-Checker workflow for Dépenses and Paiements
--
-- RÈGLE :
--   - Les enregistrements EXISTANTS conservent le statut 'validated' (déjà appliqués).
--   - Les NOUVEAUX enregistrements créés après cette migration démarrent en 'pending_validation'.
--   - Le Super Admin (role = 'admin') peut créer ET valider lui-même (pas de restriction maker-checker).
--   - Tout autre rôle doit faire valider par une personne différente (principe de séparation).
--
-- Statuts valides : 'pending_validation' | 'validated' | 'cancelled'

-- ─── Dépenses ───────────────────────────────────────────────────────────────

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS validation_status   TEXT                     NOT NULL DEFAULT 'validated',
  ADD COLUMN IF NOT EXISTS validated_by_id     UUID,
  ADD COLUMN IF NOT EXISTS validated_by_name   TEXT,
  ADD COLUMN IF NOT EXISTS validated_at        TIMESTAMP WITH TIME ZONE;

-- ─── Paiements ──────────────────────────────────────────────────────────────

ALTER TABLE order_payments
  ADD COLUMN IF NOT EXISTS validation_status   TEXT                     NOT NULL DEFAULT 'validated',
  ADD COLUMN IF NOT EXISTS validated_by_id     UUID,
  ADD COLUMN IF NOT EXISTS validated_by_name   TEXT,
  ADD COLUMN IF NOT EXISTS validated_at        TIMESTAMP WITH TIME ZONE;
