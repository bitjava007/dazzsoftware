import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { validateStockEntry, cancelStockEntry } from "@/actions/stock-entrees";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";

const UNIT_LABELS: Record<string, string> = {
  piece: "pcs", metre: "m", centimetre: "cm", bobine: "bob.",
  rouleau: "rou.", kilogramme: "kg", gramme: "g", litre: "L",
  paquet: "pqt", boite: "bte", autre: "—",
};

export default async function EntreeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await prisma.stockEntry.findUnique({
    where: { id: id },
    include: {
      supplier: true,
      createdBy: true,
      validatedBy: true,
      lines: { include: { supply: true, location: true } },
    },
  });

  if (!entry) notFound();

  const validateAction = validateStockEntry.bind(null, id);
  const cancelAction = cancelStockEntry.bind(null, id);

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/fournitures/entrees"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-mono">{entry.reference}</h1>
              <p className="text-xs text-gray-500">{formatDate(entry.date)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {entry.status === "draft" && (
              <>
                <form action={validateAction}>
                  <Button type="submit" size="sm" className="gap-1.5">
                    <CheckCircle className="w-4 h-4" />Valider
                  </Button>
                </form>
                <form action={cancelAction}>
                  <Button type="submit" variant="outline" size="sm" className="gap-1.5 text-red-600">
                    <XCircle className="w-4 h-4" />Annuler
                  </Button>
                </form>
              </>
            )}
            {entry.status === "validated" && <Badge variant="success">Validé</Badge>}
            {entry.status === "cancelled" && <Badge variant="destructive">Annulé</Badge>}
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-500">Fournisseur</p><p className="font-medium">{entry.supplier?.name ?? "—"}</p></div>
            <div><p className="text-xs text-gray-500">N° Facture</p><p className="font-medium">{entry.supplierInvoice ?? "—"}</p></div>
            <div><p className="text-xs text-gray-500">Créé par</p><p className="font-medium">{entry.createdBy?.fullName ?? "—"}</p></div>
            {entry.validatedBy && <div><p className="text-xs text-gray-500">Validé par</p><p className="font-medium">{entry.validatedBy.fullName} — {formatDateTime(entry.validatedAt)}</p></div>}
            {entry.comment && <div className="col-span-2"><p className="text-xs text-gray-500">Commentaire</p><p>{entry.comment}</p></div>}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Détail des fournitures</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fourniture</TableHead>
                  <TableHead>Emplacement</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead className="text-right">Prix unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{l.supply.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{l.location.name}</TableCell>
                    <TableCell className="text-right text-sm">{Number(l.quantity).toLocaleString("fr-FR")} {UNIT_LABELS[l.supply.unit]}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(Number(l.unitCost))}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(Number(l.totalCost))}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-semibold">Total</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(Number(entry.totalAmount))}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
