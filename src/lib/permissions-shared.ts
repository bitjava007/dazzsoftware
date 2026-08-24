// Types and constants shared between server and client — no server imports here.

export const ALL_MODULES = [
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
  "fournitures",
] as const;

export type AppModule = (typeof ALL_MODULES)[number];

export interface ModulePerms {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export type UserPermissions = Record<AppModule, ModulePerms>;
