import { prisma } from "@/lib/prisma";
import { getMyPermissions } from "@/lib/permissions";
import { toggleSupplierActive } from "@/actions/fournisseurs";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Plus, Edit2, Power, PowerOff } from "lucide-react";

export default async function FournisseursPage() {
  const [suppliers, perms] = await Promise.all([
    prisma.supplier.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
    getMyPermissions(),
  ]);

  const canCreate = perms["fournitures_fournisseurs"].canCreate;
  const canEdit   = perms["fournitures_fournisseurs"].canEdit;

  const active   = suppliers.filter((s) => s.isActive).length;
  const inactive = suppliers.filter((s) => !s.isActive).length;

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
            <p className="text-sm text-gray-500 mt-1">
              {active} actif{active !== 1 ? "s" : ""}
              {inactive > 0 ? ` · ${inactive} inactif${inactive !== 1 ? "s" : ""}` : ""}
            </p>
          </div>
          {canCreate && (
            <Button asChild>
              <Link href="/fournitures/fournisseurs/nouveau">
                <Plus className="w-4 h-4 mr-2" />Nouveau fournisseur
              </Link>
            </Button>
          )}
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ville / Pays</TableHead>
                  <TableHead>Statut</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-10 text-gray-400">
                      Aucun fournisseur
                    </TableCell>
                  </TableRow>
                ) : suppliers.map((s) => (
                  <TableRow key={s.id} className={!s.isActive ? "opacity-60" : ""}>
                    <TableCell className="font-medium text-sm">
                      {s.name}
                      {s.contactName && (
                        <span className="block text-xs text-gray-400">Contact : {s.contactName}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {s.phone ?? s.whatsappNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{s.email ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {[s.city, s.country].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.isActive ? "success" : "secondary"}>
                        {s.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                            <Link href={`/fournitures/fournisseurs/${s.id}/modifier`}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                          <form action={async () => {
                            "use server";
                            await toggleSupplierActive(s.id, !s.isActive);
                          }}>
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className={`h-8 px-2 ${s.isActive ? "text-red-500 hover:text-red-700" : "text-green-600 hover:text-green-800"}`}
                              title={s.isActive ? "Désactiver" : "Réactiver"}
                            >
                              {s.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {inactive > 0 && (
          <p className="text-xs text-gray-400">
            Les fournisseurs inactifs restent visibles dans l&apos;historique mais ne peuvent plus être sélectionnés pour de nouvelles opérations.
          </p>
        )}
      </div>
    </div>
  );
}
