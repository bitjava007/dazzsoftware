"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STANDARD_MODULES, FOURNITURES_MODULES, type AppModule, type UserPermissions } from "@/lib/permissions-shared";
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

// Sub-modules that are read-only — no create/edit/delete actions apply
const VIEW_ONLY_MODULES = new Set<AppModule>(["fournitures_etat_stock", "fournitures_historique"]);

const ACTION_LABELS = [
  { key: "canView",   label: "Voir"       },
  { key: "canCreate", label: "Créer"      },
  { key: "canEdit",   label: "Modifier"   },
  { key: "canDelete", label: "Supprimer"  },
] as const;

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

  const toggle = (mod: AppModule, action: keyof ModulePermsKey) => {
    // View-only modules: only canView is togglable
    if (VIEW_ONLY_MODULES.has(mod) && action !== "canView") return;

    setPerms((prev) => {
      const current = { ...prev[mod] };
      current[action] = !current[action];

      // canView unchecked → revoke all
      if (action === "canView" && !current.canView) {
        current.canCreate = false;
        current.canEdit   = false;
        current.canDelete = false;
      }
      // any sub-action checked → force canView
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
    const isViewOnly = VIEW_ONLY_MODULES.has(mod);
    return (
      <tr key={mod} className="hover:bg-gray-50 transition-colors">
        <td className={`py-3 pr-6 font-medium text-gray-800 ${indent ? "pl-4" : ""}`}>
          {indent && <span className="text-gray-300 mr-2">│</span>}
          {label}
        </td>
        {ACTION_LABELS.map(({ key }) => {
          const disabled = isViewOnly && key !== "canView";
          return (
            <td key={key} className="py-3 px-4 text-center">
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
                <th key={key} className="text-center font-semibold text-gray-700 py-3 px-4 w-28">
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
              <td colSpan={5} className="pt-5 pb-2">
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

// local type alias to satisfy TypeScript in the toggle handler
type ModulePermsKey = { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
