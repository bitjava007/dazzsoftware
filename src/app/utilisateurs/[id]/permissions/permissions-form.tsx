"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STANDARD_MODULES, FOURNITURES_MODULES, type AppModule, type UserPermissions, type ModulePerms } from "@/lib/permissions-shared";
import { saveUserPermissions } from "@/actions/permissions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const STANDARD_LABELS: Record<string, string> = {
  clients:        "Clients",
  mesures:        "Mesures",
  articles:       "Articles",
  commandes:      "Commandes",
  depenses:       "Dépenses",
  paiements:      "Paiements",
  factures:       "Factures",
  rapports:       "Rapports",
  taux_de_change: "Taux de change",
  notifications:  "Notifications",
  utilisateurs:   "Utilisateurs",
  parametres:     "Paramètres",
};

const FOURNITURES_LABELS: Record<string, string> = {
  fournitures:              "Fournitures (liste)",
  fournitures_entrees:      "Entrées",
  fournitures_sorties:      "Sorties",
  fournitures_transferts:   "Transferts",
  fournitures_inventaire:   "Inventaire",
  fournitures_ajustements:  "Ajustements",
  fournitures_etat_stock:   "État du stock",
  fournitures_historique:   "Historique",
  fournitures_fournisseurs: "Fournisseurs",
  fournitures_emplacements: "Emplacements",
};

// Read-only sub-modules — no CRUD or workflow actions apply
const VIEW_ONLY_MODULES = new Set<AppModule>(["fournitures_etat_stock", "fournitures_historique"]);
// Modules with no stock workflow (validate/cancel not applicable)
const NO_WORKFLOW_MODULES = new Set<AppModule>([
  ...Array.from(VIEW_ONLY_MODULES),
  "clients", "mesures", "articles", "commandes", "depenses",
  "paiements", "factures", "rapports", "taux_de_change",
  "notifications", "utilisateurs", "parametres",
  "fournitures", "fournitures_fournisseurs", "fournitures_emplacements",
]);

const ACTION_LABELS = [
  { key: "canView",     label: "Voir"      },
  { key: "canCreate",   label: "Créer"     },
  { key: "canEdit",     label: "Modifier"  },
  { key: "canDelete",   label: "Supprimer" },
  { key: "canValidate", label: "Valider"   },
  { key: "canCancel",   label: "Annuler"   },
] as const;

type PermKey = keyof ModulePerms;

interface Props {
  userId: string;
  initial: UserPermissions;
}

export function PermissionsForm({ userId, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [perms, setPerms] = useState<UserPermissions>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toggle = (mod: AppModule, action: PermKey) => {
    if (VIEW_ONLY_MODULES.has(mod) && action !== "canView") return;
    if (NO_WORKFLOW_MODULES.has(mod) && (action === "canValidate" || action === "canCancel")) return;

    setPerms((prev) => {
      const current: ModulePerms = { ...prev[mod] };
      current[action] = !current[action];

      // canView unchecked → revoke everything
      if (action === "canView" && !current.canView) {
        current.canCreate   = false;
        current.canEdit     = false;
        current.canDelete   = false;
        current.canValidate = false;
        current.canCancel   = false;
      }
      // any positive action → force canView
      if (action !== "canView" && current[action]) {
        current.canView = true;
      }

      return { ...prev, [mod]: current };
    });
    setSaved(false);
  };

  const handleSave = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveUserPermissions(userId, perms);
      if (result.success) {
        setSaved(true);
        router.refresh();
      } else {
        setError(result.error ?? "Erreur inconnue");
      }
    });
  };

  const renderRow = (mod: AppModule, label: string, indent = false) => {
    const isViewOnly  = VIEW_ONLY_MODULES.has(mod);
    const noWorkflow  = NO_WORKFLOW_MODULES.has(mod);
    return (
      <tr key={mod} className="hover:bg-gray-50 transition-colors">
        <td className={`py-3 pr-6 font-medium text-gray-800 ${indent ? "pl-4" : ""}`}>
          {indent && <span className="text-gray-300 mr-2">│</span>}
          {label}
        </td>
        {ACTION_LABELS.map(({ key }) => {
          const isWorkflowCol = key === "canValidate" || key === "canCancel";
          const disabled =
            (isViewOnly && key !== "canView") ||
            (noWorkflow && isWorkflowCol);

          return (
            <td key={key} className="py-3 px-3 text-center">
              {disabled ? (
                <span className="text-gray-300 text-xs select-none">—</span>
              ) : (
                <Switch
                  checked={perms[mod][key]}
                  onCheckedChange={() => toggle(mod, key)}
                  aria-label={`${label} — ${key}`}
                />
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left font-semibold text-gray-700 py-3 pr-6 w-52">Module</th>
              {ACTION_LABELS.map(({ key, label }) => (
                <th
                  key={key}
                  className={`text-center font-semibold py-3 px-3 w-24 ${
                    key === "canValidate" || key === "canCancel"
                      ? "text-blue-700 bg-blue-50"
                      : "text-gray-700"
                  }`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Standard modules */}
            {STANDARD_MODULES.map((mod) =>
              renderRow(mod as AppModule, STANDARD_LABELS[mod] ?? mod)
            )}

            {/* Fournitures & Stock section */}
            <tr>
              <td colSpan={7} className="pt-5 pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 whitespace-nowrap px-2">
                    Gestion des fournitures &amp; stock
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
              </td>
            </tr>

            {FOURNITURES_MODULES.map((mod) =>
              renderRow(mod as AppModule, FOURNITURES_LABELS[mod] ?? mod, true)
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
        <strong>Valider / Annuler :</strong> Colonnes réservées aux modules de stock avec flux de validation
        (Entrées, Sorties, Transferts, Inventaire, Ajustements). Le principe de séparation des responsabilités
        (maker-checker) est appliqué — un utilisateur ne peut pas valider ni annuler sa propre opération.
      </div>

      <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Enregistrement…" : "Enregistrer les permissions"}
        </Button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">Permissions enregistrées.</span>
        )}
        {error && (
          <span className="text-sm text-red-600">{error}</span>
        )}
      </div>
    </div>
  );
}
