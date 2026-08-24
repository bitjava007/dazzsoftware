import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { validateStockExit, cancelStockExit } from "@/actions/stock-sorties";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
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
const DEST_LABELS: Record<string, string> = {
  atelier_couture: "Atelier couture", boutique: "Boutique", depot: "Dépôt",
  autre: "Autre", perte_dommage: "Perte/Dommage",
};
const REASON_LABELS: Record<string, string> = {
  consommation_production: "Consommation production", reparation: "Réparation",
  echantillon: "Échantillon", perte: "Perte", dommage: "Dommage",
  don: "Don", ajustement: "Ajustement", autre: "Autre",
};

export default async function SortieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exitRecord = await prisma.stockExit.findUnique({
    where: { id: id },
    include: { createdBy: true, validatedBy: true, lines: { include: { supply: true, location: true } } },
  });

  if (!exitRecord) notFound();

  const validateAction = validateStockExit.bind(null, id);
  const cancelAction = cancelStockExit.bind(null, id);

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/fournitures/sorties"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold font-mono">{exitRecord.reference}</h1>
              <p className="text-xs text-gray-500">{formatDate(exitRecord.date)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {exitRecord.status === "draft" && (
              <>
                <form action={validateAction}><Button type="submit" size="sm" className="gap-1.5"><CheckCircle className="w-4 h-4" />Valider</Button></form>
                <form action={cancelAction}><Button type="submit" variant="outline" size="sm" className="gap-1.5 text-red-600"><XCircle className="w-4 h-4" />Annuler</Button></form>
              </>
            )}
            {exitRecord.status === "validated" && <Badge variant="success">Validé</Badge>}
            {exitRecord.status === "cancelled" && <Badge variant="destructive">Annulé</Badge>}
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-500">Destination</p><p className="font-medium">{DEST_LABELS[exitRecord.destination] ?? exitRecord.destination}</p></div>
            <div><p className="text-xs text-gray-500">Motif</p><p className="font-medium">{REASON_LABELS[exitRecord.reason] ?? exitRecord.reason}</p></div>
            <div><p className="text-xs text-gray-500">Créé par</p><p className="font-medium">{exitRecord.createdBy?.fullName ?? "—"}</p></div>
            {exitRecord.externalRef && <div><p className="text-xs text-gray-500">Référence</p><p className="font-medium">{exitRecord.externalRef}</p></div>}
            {exitRecord.validatedBy && <div><p className="text-xs text-gray-500">Validé par</p><p className="font-medium">{exitRecord.validatedBy.fullName} — {formatDateTime(exitRecord.validatedAt)}</p></div>}
            {exitRecord.comment && <div className="col-span-2"><p className="text-xs text-gray-500">Commentaire</p><p>{exitRecord.comment}</p></div>}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Fournitures sorties</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fourniture</TableHead>
                  <TableHead>Emplacement source</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exitRecord.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{l.supply.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{l.location.name}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{Number(l.quantity).toLocaleString("fr-FR")} {UNIT_LABELS[l.supply.unit]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
