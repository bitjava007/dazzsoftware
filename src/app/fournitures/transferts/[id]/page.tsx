import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { validateStockTransfer } from "@/actions/stock-transferts";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { ArrowLeft, CheckCircle, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

const UNIT_LABELS: Record<string, string> = {
  piece: "pcs", metre: "m", centimetre: "cm", bobine: "bob.",
  rouleau: "rou.", kilogramme: "kg", gramme: "g", litre: "L",
  paquet: "pqt", boite: "bte", autre: "—",
};

export default async function TransfertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id: id },
    include: {
      fromLocation: true,
      toLocation: true,
      createdBy: true,
      validatedBy: true,
      lines: { include: { supply: true } },
    },
  });

  if (!transfer) notFound();

  const validateAction = validateStockTransfer.bind(null, id);

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/fournitures/transferts"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold font-mono">{transfer.reference}</h1>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                {transfer.fromLocation.name} <ArrowRight className="w-3 h-3" /> {transfer.toLocation.name} — {formatDate(transfer.date)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {(transfer.status === "draft" || transfer.status === "shipped") && (
              <form action={validateAction}>
                <Button type="submit" size="sm" className="gap-1.5"><CheckCircle className="w-4 h-4" />Valider (réceptionné)</Button>
              </form>
            )}
            {transfer.status === "received" && <Badge variant="success">Reçu</Badge>}
            {transfer.status === "cancelled" && <Badge variant="destructive">Annulé</Badge>}
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-500">Source</p><p className="font-medium">{transfer.fromLocation.name}</p></div>
            <div><p className="text-xs text-gray-500">Destination</p><p className="font-medium">{transfer.toLocation.name}</p></div>
            <div><p className="text-xs text-gray-500">Créé par</p><p className="font-medium">{transfer.createdBy?.fullName ?? "—"}</p></div>
            {transfer.validatedBy && <div><p className="text-xs text-gray-500">Validé par</p><p className="font-medium">{transfer.validatedBy.fullName}</p></div>}
            {transfer.comment && <div className="col-span-2"><p className="text-xs text-gray-500">Commentaire</p><p>{transfer.comment}</p></div>}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Fournitures transférées</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fourniture</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfer.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm">{l.supply.name}</TableCell>
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
