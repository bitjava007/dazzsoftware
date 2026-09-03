import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { validateAdjustment, cancelAdjustment } from "@/actions/stock-ajustements";
import { getMyPermissions } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

const REASON_LABELS: Record<string, string> = {
  damage: "Dommage",
  loss: "Perte",
  expiry: "Péremption",
  count_error: "Erreur de comptage",
  production_use: "Usage production",
  other: "Autre",
};

const UNIT_LABELS: Record<string, string> = {
  piece: "pcs", metre: "m", centimetre: "cm", bobine: "bob.",
  rouleau: "rou.", kilogramme: "kg", gramme: "g", litre: "L",
  paquet: "pqt", boite: "bte", autre: "—",
};

export default async function AjustementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [adjustment, perms] = await Promise.all([
    prisma.stockAdjustment.findUnique({
      where: { id },
      include: {
        createdBy:   { select: { fullName: true } },
        validatedBy: { select: { fullName: true } },
        lines: {
          include: {
            supply:   { select: { name: true, unit: true } },
            location: { select: { name: true } },
          },
          orderBy: { supply: { name: "asc" } },
        },
      },
    }),
    getMyPermissions(),
  ]);

  if (!adjustment) notFound();

  const currentUserId = user?.id;
  const isDraft       = adjustment.status === "draft";
  const isCreator     = adjustment.createdById === currentUserId;

  const canValidate     = perms["fournitures_ajustements"].canValidate;
  const canCancel       = perms["fournitures_ajustements"].canCancel;
  const canValidateThis = canValidate && !isCreator;
  const canCancelThis   = canCancel   && !isCreator;

  const validateAction = validateAdjustment.bind(null, id);
  const cancelAction   = cancelAdjustment.bind(null, id);

  const totalPositive = adjustment.lines.reduce((s, l) => s + (Number(l.quantityDelta) > 0 ? Number(l.quantityDelta) : 0), 0);
  const totalNegative = adjustment.lines.reduce((s, l) => s + (Number(l.quantityDelta) < 0 ? Number(l.quantityDelta) : 0), 0);

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/fournitures/ajustements"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold font-mono">{adjustment.reference}</h1>
              <p className="text-xs text-gray-500">{formatDate(adjustment.date)} — {REASON_LABELS[adjustment.reason] ?? adjustment.reason}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {adjustment.status === "draft"     && <Badge variant="warning">Brouillon</Badge>}
            {adjustment.status === "validated" && <Badge variant="success">Validé</Badge>}
            {adjustment.status === "cancelled" && <Badge variant="destructive">Annulé</Badge>}
            {isDraft && canValidateThis && (
              <form action={validateAction}>
                <Button type="submit" size="sm" className="gap-1.5">
                  <CheckCircle className="w-4 h-4" />Valider
                </Button>
              </form>
            )}
            {isDraft && canCancelThis && (
              <form action={cancelAction}>
                <Button type="submit" variant="outline" size="sm" className="gap-1.5 text-red-600 border-red-200">
                  <XCircle className="w-4 h-4" />Annuler
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Maker-checker notice */}
        {isDraft && isCreator && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <strong>En attente de validation</strong> — Vous avez créé cet ajustement.
            Le stock ne sera modifié qu&apos;après validation par un autre utilisateur disposant de la permission <strong>Valider</strong>.
          </div>
        )}

        {/* Draft notice for non-creator without validate perm */}
        {isDraft && !isCreator && !canValidate && (
          <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
            Cet ajustement est en attente de validation. Le stock n&apos;a pas encore été modifié.
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white rounded-lg p-3 shadow-sm border">
            <p className="text-xl font-bold">{adjustment.lines.length}</p>
            <p className="text-xs text-gray-500">Lignes</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border">
            <p className="text-xl font-bold text-green-600">+{totalPositive.toLocaleString("fr-FR")}</p>
            <p className="text-xs text-gray-500">Ajouts</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm border">
            <p className="text-xl font-bold text-red-600">{totalNegative.toLocaleString("fr-FR")}</p>
            <p className="text-xs text-gray-500">Retraits</p>
          </div>
        </div>

        {/* Metadata */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Créé par</p>
              <p className="font-medium">{adjustment.createdBy?.fullName ?? "—"}</p>
            </div>
            {adjustment.validatedBy && (
              <div>
                <p className="text-xs text-gray-500">{adjustment.status === "validated" ? "Validé par" : "Annulé par"}</p>
                <p className="font-medium">{adjustment.validatedBy.fullName} — {formatDateTime(adjustment.validatedAt)}</p>
              </div>
            )}
            {adjustment.comment && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Commentaire</p>
                <p>{adjustment.comment}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lines table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Lignes d&apos;ajustement
              {adjustment.status === "draft" && (
                <span className="ml-2 text-xs font-normal text-amber-600">(stock non encore modifié)</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fourniture</TableHead>
                  <TableHead>Emplacement</TableHead>
                  <TableHead className="text-right">Avant</TableHead>
                  <TableHead className="text-right">Après</TableHead>
                  <TableHead className="text-right">Écart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustment.lines.map((line) => {
                  const unit    = UNIT_LABELS[line.supply.unit] ?? line.supply.unit;
                  const delta   = Number(line.quantityDelta);
                  const before  = Number(line.quantityBefore);
                  const after   = Number(line.quantityAfter);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="text-sm font-medium">{line.supply.name}</TableCell>
                      <TableCell className="text-sm text-gray-500">{line.location.name}</TableCell>
                      <TableCell className="text-right text-sm font-mono text-gray-500">
                        {before.toLocaleString("fr-FR")} {unit}
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono">
                        {after.toLocaleString("fr-FR")} {unit}
                      </TableCell>
                      <TableCell className={`text-right text-sm font-mono font-semibold ${
                        delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-gray-400"
                      }`}>
                        {delta > 0 ? "+" : ""}{delta.toLocaleString("fr-FR")} {unit}
                      </TableCell>
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
