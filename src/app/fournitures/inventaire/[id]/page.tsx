import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { validateInventorySession, cancelInventorySession } from "@/actions/stock-inventaire";
import { getMyPermissions } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { InventoryLineInput } from "@/components/fournitures/inventory-line-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

const UNIT_LABELS: Record<string, string> = {
  piece: "pcs", metre: "m", centimetre: "cm", bobine: "bob.",
  rouleau: "rou.", kilogramme: "kg", gramme: "g", litre: "L",
  paquet: "pqt", boite: "bte", autre: "—",
};

export default async function InventaireDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [session, perms] = await Promise.all([
    prisma.inventorySession.findUnique({
      where: { id },
      include: {
        location: true,
        createdBy: true,
        validatedBy: true,
        lines: { include: { supply: true, location: true }, orderBy: { supply: { name: "asc" } } },
      },
    }),
    getMyPermissions(),
  ]);

  if (!session) notFound();

  const currentUserId = user?.id;
  const isEditable = session.status === "in_progress";
  const isDraft = session.status === "in_progress" || session.status === "draft";

  const canValidate = perms["fournitures_inventaire"].canValidate;
  const canCancel   = perms["fournitures_inventaire"].canCancel;
  const isCreator   = session.createdById === currentUserId;
  // Admin (unrestricted) can self-validate; others cannot
  const canValidateThis = canValidate && !isCreator;
  const canCancelThis   = canCancel   && !isCreator;

  const validateAction = validateInventorySession.bind(null, id);
  const cancelAction   = cancelInventorySession.bind(null, id);

  const saisiesCount  = session.lines.filter((l) => l.physicalQty !== null).length;
  const totalLines    = session.lines.length;
  const ecartsNonNuls = session.lines.filter((l) => l.variance !== null && Number(l.variance) !== 0).length;

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/fournitures/inventaire"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold font-mono">{session.reference}</h1>
              <p className="text-xs text-gray-500">
                {formatDate(session.date)} — {session.location?.name ?? "Tous emplacements"}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isDraft && canValidateThis && (
              <form action={validateAction}>
                <Button type="submit" size="sm" className="gap-1.5">
                  <CheckCircle className="w-4 h-4" />Valider l&apos;inventaire
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
            {session.status === "validated" && <Badge variant="success">Validé</Badge>}
            {session.status === "cancelled" && <Badge variant="destructive">Annulé</Badge>}
          </div>
        </div>

        {/* Maker-checker notice */}
        {isDraft && isCreator && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <strong>En attente de validation</strong> — Vous êtes le créateur de cet inventaire.
            Un autre utilisateur disposant de la permission <strong>Valider</strong> doit valider vos saisies.
          </div>
        )}

        {/* Info banner when editable */}
        {isEditable && !isCreator && (
          <p className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
            Saisissez les quantités physiques constatées. L&apos;écart est calculé automatiquement.
            La validation génèrera les ajustements de stock pour tous les écarts détectés.
          </p>
        )}

        {/* Progress summary */}
        {isEditable && (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <p className="text-xl font-bold">{saisiesCount}/{totalLines}</p>
              <p className="text-xs text-gray-500">Lignes saisies</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <p className="text-xl font-bold text-orange-600">{ecartsNonNuls}</p>
              <p className="text-xs text-gray-500">Écarts détectés</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm border">
              <p className="text-xl font-bold text-gray-400">{totalLines - saisiesCount}</p>
              <p className="text-xs text-gray-500">Restantes</p>
            </div>
          </div>
        )}

        {/* Metadata */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Créé par</p>
              <p className="font-medium">{session.createdBy?.fullName ?? "—"}</p>
            </div>
            {session.validatedBy && (
              <div>
                <p className="text-xs text-gray-500">Validé par</p>
                <p className="font-medium">{session.validatedBy.fullName} — {formatDateTime(session.validatedAt)}</p>
              </div>
            )}
            {session.comment && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Commentaire</p>
                <p>{session.comment}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory lines table */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lignes d&apos;inventaire ({totalLines})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fourniture</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>Emplacement</TableHead>
                  <TableHead className="text-right">Stock théorique</TableHead>
                  <TableHead className="text-right">Quantité physique</TableHead>
                  <TableHead className="text-right">Écart</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.lines.map((line) => {
                  const unit     = UNIT_LABELS[line.supply.unit] ?? line.supply.unit;
                  const variance = line.variance !== null ? Number(line.variance) : null;
                  const hasQty   = line.physicalQty !== null;

                  return (
                    <TableRow key={line.id}>
                      <TableCell className="text-sm font-medium">{line.supply.name}</TableCell>
                      <TableCell className="text-xs text-gray-500">{unit}</TableCell>
                      <TableCell className="text-sm text-gray-500">{line.location.name}</TableCell>
                      <TableCell className="text-right text-sm font-mono">
                        {Number(line.theoreticalQty).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditable ? (
                          <InventoryLineInput
                            lineId={line.id}
                            theoreticalQty={Number(line.theoreticalQty)}
                            initialPhysicalQty={line.physicalQty !== null ? Number(line.physicalQty) : null}
                            unit={line.supply.unit}
                          />
                        ) : (
                          <span className="text-sm font-mono">
                            {hasQty ? Number(line.physicalQty).toLocaleString("fr-FR") : "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-mono">
                        {variance !== null ? (
                          <span className={
                            variance < 0 ? "text-red-600 font-semibold" :
                            variance > 0 ? "text-green-600 font-semibold" :
                            "text-gray-400"
                          }>
                            {variance > 0 ? "+" : ""}{variance.toLocaleString("fr-FR")} {unit}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {!hasQty ? (
                          <span className="text-xs text-gray-400">En attente</span>
                        ) : variance === 0 ? (
                          <span className="text-xs text-green-600">OK</span>
                        ) : (
                          <span className="text-xs text-orange-600 font-medium">Écart</span>
                        )}
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
