import { prisma } from "@/lib/prisma";
import { getMyPermissions } from "@/lib/permissions";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

const REASON_LABELS: Record<string, string> = {
  damage: "Dommage",
  loss: "Perte",
  expiry: "Péremption",
  count_error: "Erreur de comptage",
  production_use: "Usage production",
  other: "Autre",
};

const STATUS_BADGE: Record<string, { label: string; variant: "secondary" | "success" | "destructive" | "warning" }> = {
  draft:     { label: "Brouillon",  variant: "warning" },
  validated: { label: "Validé",     variant: "success" },
  cancelled: { label: "Annulé",     variant: "destructive" },
};

export default async function AjustementsPage() {
  const [adjustments, perms] = await Promise.all([
    prisma.stockAdjustment.findMany({
      include: {
        createdBy:   { select: { fullName: true } },
        validatedBy: { select: { fullName: true } },
        lines: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getMyPermissions(),
  ]);

  const canCreate = perms["fournitures_ajustements"].canCreate;

  const draftCount     = adjustments.filter((a) => a.status === "draft").length;
  const validatedCount = adjustments.filter((a) => a.status === "validated").length;

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ajustements de stock</h1>
            <p className="text-sm text-gray-500 mt-1">
              {validatedCount} validé{validatedCount !== 1 ? "s" : ""}
              {draftCount > 0 ? ` · ${draftCount} brouillon${draftCount !== 1 ? "s" : ""} en attente` : ""}
            </p>
          </div>
          {canCreate && (
            <Button asChild>
              <Link href="/fournitures/ajustements/nouveau">
                <Plus className="w-4 h-4 mr-2" />Nouvel ajustement
              </Link>
            </Button>
          )}
        </div>

        {draftCount > 0 && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <strong>{draftCount} ajustement{draftCount !== 1 ? "s" : ""} en attente de validation.</strong>
            {" "}Les brouillons n&apos;ont pas encore modifié le stock — cliquez pour valider ou annuler.
          </div>
        )}

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Lignes</TableHead>
                  <TableHead>Créé par</TableHead>
                  <TableHead>Validé par</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-gray-400">
                      Aucun ajustement
                    </TableCell>
                  </TableRow>
                ) : adjustments.map((a) => {
                  const statusInfo = STATUS_BADGE[a.status] ?? { label: a.status, variant: "secondary" as const };
                  return (
                    <TableRow key={a.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell>
                        <Link href={`/fournitures/ajustements/${a.id}`} className="font-mono text-xs hover:underline">
                          {a.reference}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(a.date)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{REASON_LABELS[a.reason] ?? a.reason}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{a.lines.length} ligne{a.lines.length !== 1 ? "s" : ""}</TableCell>
                      <TableCell className="text-sm text-gray-500">{a.createdBy?.fullName ?? "—"}</TableCell>
                      <TableCell className="text-sm text-gray-500">{a.validatedBy?.fullName ?? "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
