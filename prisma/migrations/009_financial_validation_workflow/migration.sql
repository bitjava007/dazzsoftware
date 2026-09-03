-- Migration 009: Maker-Checker workflow pour Dépenses et Paiements
--
-- STRATÉGIE EN 3 ÉTAPES PAR TABLE :
--
--   Étape 1 : Ajouter la colonne avec DEFAULT 'validated'
--             → les lignes EXISTANTES reçoivent automatiquement 'validated'.
--
--   Étape 2 : UPDATE explicite pour confirmer tous les existants à 'validated'
--             (belt-and-suspenders : garantit l'état même si IF NOT EXISTS
--              saute l'étape 1 sur une colonne déjà présente).
--
--   Étape 3 : ALTER COLUMN … SET DEFAULT 'pending_validation'
--             → toute nouvelle insertion sans valeur explicite part de
--               'pending_validation' (obligatoire côté base de données,
--                indépendamment de l'application).
--
-- RÈGLES MÉTIER :
--   • Enregistrements EXISTANTS  → conservent 'validated' (déjà comptabilisés).
--   • Nouveaux enregistrements   → démarrent en 'pending_validation'.
--   • Admin (role = 'admin')     → l'application insère directement 'validated'
--                                  (auto-validation, pas de restriction maker-checker).
--   • Autres rôles               → l'application insère 'pending_validation' ;
--                                  un second utilisateur avec canValidate doit valider.
--
-- Statuts valides : 'pending_validation' | 'validated' | 'cancelled'

-- ════════════════════════════════════════════════════════════════════════════
--  DÉPENSES (table : expenses)
-- ════════════════════════════════════════════════════════════════════════════

-- Étape 1 : ajout avec DEFAULT temporaire 'validated'
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS validation_status   TEXT                     NOT NULL DEFAULT 'validated',
  ADD COLUMN IF NOT EXISTS validated_by_id     UUID,
  ADD COLUMN IF NOT EXISTS validated_by_name   TEXT,
  ADD COLUMN IF NOT EXISTS validated_at        TIMESTAMP WITH TIME ZONE;

-- Étape 2 : initialisation explicite des enregistrements existants
UPDATE expenses
   SET validation_status = 'validated'
 WHERE validation_status IS NULL
    OR validation_status = '';

-- Étape 3 : changer le DEFAULT pour les nouvelles insertions
ALTER TABLE expenses
  ALTER COLUMN validation_status SET DEFAULT 'pending_validation';

-- ════════════════════════════════════════════════════════════════════════════
--  PAIEMENTS (table : order_payments)
-- ════════════════════════════════════════════════════════════════════════════

-- Étape 1 : ajout avec DEFAULT temporaire 'validated'
ALTER TABLE order_payments
  ADD COLUMN IF NOT EXISTS validation_status   TEXT                     NOT NULL DEFAULT 'validated',
  ADD COLUMN IF NOT EXISTS validated_by_id     UUID,
  ADD COLUMN IF NOT EXISTS validated_by_name   TEXT,
  ADD COLUMN IF NOT EXISTS validated_at        TIMESTAMP WITH TIME ZONE;

-- Étape 2 : initialisation explicite des enregistrements existants
UPDATE order_payments
   SET validation_status = 'validated'
 WHERE validation_status IS NULL
    OR validation_status = '';

-- Étape 3 : changer le DEFAULT pour les nouvelles insertions
ALTER TABLE order_payments
  ALTER COLUMN validation_status SET DEFAULT 'pending_validation';
