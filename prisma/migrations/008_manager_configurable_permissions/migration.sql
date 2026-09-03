-- Migration 008: Manager role is now permission-configurable (like accountant/tailor/user_basic)
-- Only the "admin" role retains automatic full-access bypass.
--
-- To avoid breaking existing managers who had implicit full access,
-- this migration inserts full permissions for all current manager accounts.
-- The Super Admin can later reduce their permissions module by module.

INSERT INTO user_module_permissions (id, user_id, module, can_view, can_create, can_edit, can_delete, can_validate, can_cancel, updated_at)
SELECT
  gen_random_uuid(),
  p.id,
  m.module::app_module,
  true, true, true, true, true, true,
  NOW()
FROM profiles p
CROSS JOIN (
  VALUES
    ('clients'), ('mesures'), ('articles'), ('commandes'), ('depenses'),
    ('paiements'), ('factures'), ('rapports'), ('taux_de_change'), ('notifications'),
    ('utilisateurs'), ('parametres'), ('fournitures'), ('fournitures_entrees'),
    ('fournitures_sorties'), ('fournitures_transferts'), ('fournitures_inventaire'),
    ('fournitures_ajustements'), ('fournitures_etat_stock'), ('fournitures_historique'),
    ('fournitures_fournisseurs'), ('fournitures_emplacements')
) AS m(module)
WHERE p.role = 'manager'
ON CONFLICT (user_id, module) DO UPDATE SET
  can_view     = true,
  can_create   = true,
  can_edit     = true,
  can_delete   = true,
  can_validate = true,
  can_cancel   = true,
  updated_at   = NOW();
