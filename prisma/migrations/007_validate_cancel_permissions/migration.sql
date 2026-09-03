-- Migration 007: Add canValidate/canCancel permissions + AdjustmentStatus workflow

-- 1. Add validation/cancellation permission columns to user_module_permissions
ALTER TABLE user_module_permissions
  ADD COLUMN IF NOT EXISTS can_validate BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_cancel   BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create the adjustment_status enum
DO $$ BEGIN
  CREATE TYPE adjustment_status AS ENUM ('draft', 'validated', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Add workflow columns to stock_adjustments
--    Default 'validated' so existing data (already applied) is treated as already validated
ALTER TABLE stock_adjustments
  ADD COLUMN IF NOT EXISTS status         adjustment_status NOT NULL DEFAULT 'validated',
  ADD COLUMN IF NOT EXISTS validated_by   UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS validated_at   TIMESTAMP WITH TIME ZONE;
