import { prisma } from "@/lib/prisma";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatCurrency } from "@/lib/utils";

const UNIT_LABELS: Record<string, string> = {
  piece: "pcs", metre: "m", centimetre: "cm", bobine: "bob.",
  rouleau: "rou.", kilogramme: "kg", gramme: "g", litre: "L",
  paquet: "pqt", boite: "bte", autre: "—",
};

const TYPE_LABELS: Record<string, string> = {
  entry: "Entrée", exit: "Sortie", transfer_out: "Transfert sortant",
  transfer_in: "Transfert entrant", adjustment: "Ajustement", inventory_adjustment: "Inventaire",
};

const TYPE_VARIANTS: Record<string, "success" | "destructive" | "secondary" | "warning"> = {
  entry: "success", exit: "destructive", transfer_out: "warning",
  transfer_in: "secondary", adjustment: "secondary", inventory_adjustment: "secondary",
};

export default async function HistoriquePage() {
  const movements = await prisma.stockMovement.findMany({
    include: {
      supply: { include: { category: true } },
      fromLocation: true,
      toLocation: true,
      createdBy: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique des mouvements</h1>
          <p className="text-sm text-gray-500 mt-1">{movements.length} mouvement{movements.length !== 1 ? "s" : ""} (200 derniers)</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Fourniture</TableHead>
                    <TableHead className="text-right">Quantité</TableHead>
                    <TableHead>De / Vers</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead className="text-right">Coût</TableHead>
                    <TableHead>Par</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-10 text-gray-400">Aucun mouvement</TableCell></TableRow>
                  ) : movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(m.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{m.reference}</TableCell>
                      <TableCell><Badge variant={TYPE_VARIANTS[m.type] ?? "secondary"} className="text-xs">{TYPE_LABELS[m.type] ?? m.type}</Badge></TableCell>
                      <TableCell className="text-sm">{m.supply.name}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {["exit", "transfer_out"].includes(m.type) ? (
                          <span className="text-red-600">-{Number(m.quantity).toLocaleString("fr-FR")} {UNIT_LABELS[m.unit]}</span>
                        ) : (
                          <span className="text-green-600">+{Number(m.quantity).toLocaleString("fr-FR")} {UNIT_LABELS[m.unit]}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {[m.fromLocation?.name, m.toLocation?.name].filter(Boolean).join(" → ") || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">{m.reason ?? "—"}</TableCell>
                      <TableCell className="text-right text-xs">{m.totalCost ? formatCurrency(Number(m.totalCost)) : "—"}</TableCell>
                      <TableCell className="text-xs text-gray-500">{m.createdBy?.fullName ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
