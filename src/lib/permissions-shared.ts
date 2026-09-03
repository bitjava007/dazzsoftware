// Types and constants shared between server and client — no server imports here.

export const STANDARD_MODULES = [
  "clients",
  "mesures",
  "articles",
  "commandes",
  "depenses",
  "paiements",
  "factures",
  "rapports",
  "taux_de_change",
  "notifications",
  "utilisateurs",
  "parametres",
] as const;

export const FOURNITURES_MODULES = [
  "fournitures",
  "fournitures_entrees",
  "fournitures_sorties",
  "fournitures_transferts",
  "fournitures_inventaire",
  "fournitures_ajustements",
  "fournitures_etat_stock",
  "fournitures_historique",
  "fournitures_fournisseurs",
  "fournitures_emplacements",
] as const;

export const ALL_MODULES = [...STANDARD_MODULES, ...FOURNITURES_MODULES] as const;

export type AppModule = (typeof ALL_MODULES)[number];

export interface ModulePerms {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canValidate: boolean;
  canCancel: boolean;
}

export type UserPermissions = Record<AppModule, ModulePerms>;
