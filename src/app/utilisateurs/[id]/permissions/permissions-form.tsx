"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ALL_MODULES, type AppModule, type UserPermissions } from "@/lib/permissions-shared";
import { saveUserPermissions } from "@/actions/permissions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const MODULE_LABELS: Record<AppModule, string> = {
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
  fournitures:    "Fournitures",
};

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

  const toggle = (mod: AppModule, action: keyof typeof perms[AppModule]) => {
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

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left font-semibold text-gray-700 py-3 pr-6 w-48">Module</th>
              {ACTION_LABELS.map(({ key, label }) => (
                <th key={key} className="text-center font-semibold text-gray-700 py-3 px-4 w-28">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ALL_MODULES.map((mod) => (
              <tr key={mod} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 pr-6 font-medium text-gray-800">
                  {MODULE_LABELS[mod]}
                </td>
                {ACTION_LABELS.map(({ key }) => (
                  <td key={key} className="py-3 px-4 text-center">
                    <Switch
                      checked={perms[mod][key]}
                      onCheckedChange={() => toggle(mod, key)}
                      aria-label={`${MODULE_LABELS[mod]} — ${key}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
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
