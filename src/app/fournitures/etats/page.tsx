import { prisma } from "@/lib/prisma";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

const UNIT_LABELS: Record<string, string> = {
  piece: "pcs", metre: "m", centimetre: "cm", bobine: "bobine",
  rouleau: "rouleau", kilogramme: "kg", gramme: "g", litre: "L",
  paquet: "paquet", boite: "boîte", autre: "—",
};

export default async function EtatsStockPage() {
  const [supplies, balances] = await Promise.all([
    prisma.supply.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.stockBalance.findMany({
      include: { location: true },
    }),
  ]);

  // Group balances by supply
  const balanceMap = new Map<string, { total: number; byLocation: { name: string; qty: number }[] }>();
  for (const b of balances) {
    const qty = Number(b.quantity);
    const existing = balanceMap.get(b.supplyId);
    if (existing) {
      existing.total += qty;
      existing.byLocation.push({ name: b.location.name, qty });
    } else {
      balanceMap.set(b.supplyId, { total: qty, byLocation: [{ name: b.location.name, qty }] });
    }
  }

  // Total value (from latest entry costs)
  const entryLines = await prisma.stockEntryLine.findMany({
    where: { entry: { status: "validated" } },
    select: { supplyId: true, unitCost: true },
  });
  const lastCostMap = new Map<string, number>();
  for (const el of entryLines) {
    lastCostMap.set(el.supplyId, Number(el.unitCost));
  }

  const totalValue = supplies.reduce((sum, s) => {
    const qty = balanceMap.get(s.id)?.total ?? 0;
    const cost = lastCostMap.get(s.id) ?? Number(s.referencePrice ?? 0);
    return sum + qty * cost;
  }, 0);

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">État des stocks</h1>
            <p className="text-sm text-gray-500 mt-1">{supplies.length} fourniture{supplies.length !== 1 ? "s" : ""} — Valeur totale : {formatCurrency(totalValue)}</p>
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fourniture</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead className="text-right">Stock total</TableHead>
                  <TableHead className="text-right">Stock min.</TableHead>
                  <TableHead>Par emplacement</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Valeur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplies.map((s) => {
                  const data = balanceMap.get(s.id) ?? { total: 0, byLocation: [] };
                  const min = Number(s.minimumStock);
                  const cost = lastCostMap.get(s.id) ?? Number(s.referencePrice ?? 0);
                  const value = data.total * cost;
                  const status = data.total === 0 ? "rupture" : data.total <= min ? "faible" : "normal";
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium text-sm">{s.name}</TableCell>
                      <TableCell className="text-sm text-gray-500">{s.category?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{UNIT_LABELS[s.unit]}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{data.total.toLocaleString("fr-FR")}</TableCell>
                      <TableCell className="text-right text-sm text-gray-500">{min > 0 ? min.toLocaleString("fr-FR") : "—"}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {data.byLocation.map((b) => `${b.name}: ${b.qty.toLocaleString("fr-FR")}`).join(" / ") || "—"}
                      </TableCell>
                      <TableCell>
                        {status === "rupture" && <Badge variant="destructive">🔴 Rupture</Badge>}
                        {status === "faible" && <Badge variant="warning">🟠 Faible</Badge>}
                        {status === "normal" && <Badge variant="success">🟢 Normal</Badge>}
                      </TableCell>
                      <TableCell className="text-right text-sm">{cost > 0 ? formatCurrency(value) : "—"}</TableCell>
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
