import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

const UNIT_LABELS: Record<string, string> = {
  piece: "pcs", metre: "m", centimetre: "cm", bobine: "bobine",
  rouleau: "rouleau", kilogramme: "kg", gramme: "g", litre: "L",
  paquet: "paquet", boite: "boîte", autre: "—",
};

const MOVEMENT_LABELS: Record<string, string> = {
  entry: "Entrée", exit: "Sortie", transfer_out: "Transfert sortant",
  transfer_in: "Transfert entrant", adjustment: "Ajustement",
  inventory_adjustment: "Inventaire",
};

export default async function SupplyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supply = await prisma.supply.findUnique({
    where: { id: id },
    include: {
      category: true,
      defaultSupplier: true,
      defaultLocation: true,
      stockBalances: { include: { location: true }, orderBy: { quantity: "desc" } },
      movements: {
        include: { fromLocation: true, toLocation: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!supply) notFound();

  const totalStock = supply.stockBalances.reduce((s, b) => s + Number(b.quantity), 0);
  const min = Number(supply.minimumStock);
  const status = totalStock === 0 ? "rupture" : totalStock <= min ? "faible" : "normal";

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/fournitures/liste"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{supply.name}</h1>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{supply.code}</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/fournitures/liste/${supply.id}/modifier`}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" />Modifier
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Stock total</p>
              <p className="text-2xl font-bold mt-1">{totalStock.toLocaleString("fr-FR")} <span className="text-sm font-normal text-gray-500">{UNIT_LABELS[supply.unit]}</span></p>
              <div className="mt-2">
                {status === "rupture" && <Badge variant="destructive">Rupture</Badge>}
                {status === "faible" && <Badge variant="warning">Stock faible</Badge>}
                {status === "normal" && <Badge variant="success">Normal</Badge>}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div><p className="text-xs text-gray-500">Catégorie</p><p className="text-sm font-medium">{supply.category?.name ?? "—"}</p></div>
              <div><p className="text-xs text-gray-500">Stock minimum</p><p className="text-sm font-medium">{min > 0 ? `${min} ${UNIT_LABELS[supply.unit]}` : "—"}</p></div>
              <div><p className="text-xs text-gray-500">Fournisseur par défaut</p><p className="text-sm font-medium">{supply.defaultSupplier?.name ?? "—"}</p></div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div><p className="text-xs text-gray-500">Unité</p><p className="text-sm font-medium">{UNIT_LABELS[supply.unit]}</p></div>
              <div><p className="text-xs text-gray-500">Prix de référence</p><p className="text-sm font-medium">{supply.referencePrice ? `${Number(supply.referencePrice).toLocaleString("fr-FR")} XOF` : "—"}</p></div>
              <div><p className="text-xs text-gray-500">Emplacement par défaut</p><p className="text-sm font-medium">{supply.defaultLocation?.name ?? "—"}</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Stock by location */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Stock par emplacement</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emplacement</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supply.stockBalances.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center text-gray-400 py-4">Aucun stock</TableCell></TableRow>
                ) : (
                  supply.stockBalances.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.location.name}</TableCell>
                      <TableCell className="text-right font-medium">{Number(b.quantity).toLocaleString("fr-FR")} {UNIT_LABELS[supply.unit]}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Movements */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Derniers mouvements</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>De / Vers</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supply.movements.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-4">Aucun mouvement</TableCell></TableRow>
                ) : (
                  supply.movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs text-gray-500">{formatDate(m.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{m.reference}</TableCell>
                      <TableCell className="text-xs">{MOVEMENT_LABELS[m.type] ?? m.type}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {m.fromLocation?.name}{m.fromLocation && m.toLocation ? " → " : ""}{m.toLocation?.name}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {["exit", "transfer_out"].includes(m.type) ? "-" : "+"}
                        {Number(m.quantity).toLocaleString("fr-FR")} {UNIT_LABELS[supply.unit]}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
