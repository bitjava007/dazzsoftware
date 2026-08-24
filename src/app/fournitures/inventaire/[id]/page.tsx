import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { validateInventorySession, updateInventoryLine } from "@/actions/stock-inventaire";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

const UNIT_LABELS: Record<string, string> = {
  piece: "pcs", metre: "m", centimetre: "cm", bobine: "bob.",
  rouleau: "rou.", kilogramme: "kg", gramme: "g", litre: "L",
  paquet: "pqt", boite: "bte", autre: "—",
};

export default async function InventaireDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await prisma.inventorySession.findUnique({
    where: { id: id },
    include: {
      location: true,
      createdBy: true,
      validatedBy: true,
      lines: { include: { supply: true, location: true }, orderBy: { supply: { name: "asc" } } },
    },
  });

  if (!session) notFound();

  const validateAction = validateInventorySession.bind(null, id);
  const isEditable = session.status === "in_progress";

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/fournitures/inventaire"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold font-mono">{session.reference}</h1>
              <p className="text-xs text-gray-500">{formatDate(session.date)} — {session.location?.name ?? "Tous emplacements"}</p>
            </div>
          </div>
          {isEditable && (
            <form action={validateAction}>
              <Button type="submit" size="sm" className="gap-1.5">
                <CheckCircle className="w-4 h-4" />Valider l&apos;inventaire
              </Button>
            </form>
          )}
          {session.status === "validated" && <Badge variant="success">Validé</Badge>}
        </div>

        {isEditable && (
          <p className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
            Saisissez les quantités physiques constatées. La validation génèrera automatiquement les ajustements pour les écarts.
          </p>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Lignes d&apos;inventaire ({session.lines.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fourniture</TableHead>
                  <TableHead>Emplacement</TableHead>
                  <TableHead className="text-right">Stock théorique</TableHead>
                  <TableHead className="text-right">Stock physique</TableHead>
                  <TableHead className="text-right">Écart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.lines.map((line) => {
                  const unit = UNIT_LABELS[line.supply.unit];
                  const variance = line.variance !== null ? Number(line.variance) : null;
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="text-sm font-medium">{line.supply.name}</TableCell>
                      <TableCell className="text-sm text-gray-500">{line.location.name}</TableCell>
                      <TableCell className="text-right text-sm">{Number(line.theoreticalQty).toLocaleString("fr-FR")} {unit}</TableCell>
                      <TableCell className="text-right">
                        {isEditable ? (
                          <form action={async (fd: FormData) => {
                            "use server";
                            await updateInventoryLine(line.id, parseFloat(fd.get("physicalQty") as string));
                          }}>
                            <div className="flex items-center gap-1 justify-end">
                              <Input name="physicalQty" type="number" min="0" step="0.001"
                                defaultValue={line.physicalQty !== null ? Number(line.physicalQty) : ""}
                                className="w-24 h-8 text-right" />
                              <Button type="submit" variant="ghost" size="sm" className="h-8 px-2 text-xs">✓</Button>
                            </div>
                          </form>
                        ) : (
                          <span className="text-sm">{line.physicalQty !== null ? `${Number(line.physicalQty).toLocaleString("fr-FR")} ${unit}` : "—"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {variance !== null ? (
                          <span className={variance < 0 ? "text-red-600 font-medium" : variance > 0 ? "text-green-600 font-medium" : "text-gray-500"}>
                            {variance > 0 ? "+" : ""}{variance.toLocaleString("fr-FR")} {unit}
                          </span>
                        ) : "—"}
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
