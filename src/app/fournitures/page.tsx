import { redirect } from "next/navigation";
import { getMyPermissions } from "@/lib/permissions";
import { FOURNITURES_MODULES } from "@/lib/permissions-shared";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, XCircle, ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

const UNIT_LABELS: Record<string, string> = {
  piece: "pcs", metre: "m", centimetre: "cm", bobine: "bob.", rouleau: "rou.",
  kilogramme: "kg", gramme: "g", litre: "L", paquet: "pqt", boite: "bte", autre: "",
};

export default async function FournituresDashboard() {
  const perms = await getMyPermissions();
  const hasAnyAccess = FOURNITURES_MODULES.some((m) => perms[m].canView);
  if (!hasAnyAccess) redirect("/dashboard");
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalSupplies,
    balances,
    entriesThisMonth,
    exitsThisMonth,
    recentEntries,
    recentExits,
  ] = await Promise.all([
    prisma.supply.count({ where: { isActive: true } }),
    prisma.stockBalance.findMany({
      include: { supply: { include: { category: true } }, location: true },
    }),
    prisma.stockEntry.count({ where: { createdAt: { gte: startOfMonth }, status: "validated" } }),
    prisma.stockExit.count({ where: { createdAt: { gte: startOfMonth }, status: "validated" } }),
    prisma.stockEntry.findMany({
      where: { status: "validated" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { supplier: true },
    }),
    prisma.stockExit.findMany({
      where: { status: "validated" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Compute stock status per supply
  const supplyMap = new Map<string, { supply: { id: string; name: string; unit: string; minimumStock: number }; total: number }>();
  for (const b of balances) {
    const key = b.supplyId;
    const existing = supplyMap.get(key);
    const qty = Number(b.quantity);
    if (existing) {
      existing.total += qty;
    } else {
      supplyMap.set(key, {
        supply: { id: b.supply.id, name: b.supply.name, unit: b.supply.unit, minimumStock: Number(b.supply.minimumStock) },
        total: qty,
      });
    }
  }

  const supplies = Array.from(supplyMap.values());
  const lowStock = supplies.filter((s) => s.total > 0 && s.total <= s.supply.minimumStock);
  const outOfStock = supplies.filter((s) => s.total === 0);

  // Total stock value (from entry lines cost)
  const valueResult = await prisma.stockEntryLine.aggregate({ _sum: { totalCost: true }, where: { entry: { status: "validated" } } });
  const totalValue = Number(valueResult._sum.totalCost ?? 0);

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fournitures & Stock</h1>
          <p className="text-sm text-gray-500 mt-1">Vue d&apos;ensemble du stock</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Fournitures", value: totalSupplies, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Stock faible", value: lowStock.length, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Ruptures", value: outOfStock.length, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
            { label: "Entrées (mois)", value: entriesThisMonth, icon: ArrowDownCircle, color: "text-green-600", bg: "bg-green-50" },
            { label: "Sorties (mois)", value: exitsThisMonth, icon: ArrowUpCircle, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Valeur stock", value: formatCurrency(totalValue), icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50", wide: true },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label} className={`border-0 shadow-sm ${(kpi as { wide?: boolean }).wide ? "col-span-2 sm:col-span-1" : ""}`}>
                <CardContent className="p-4">
                  <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center mb-2`}>
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Low stock alerts */}
          {(lowStock.length > 0 || outOfStock.length > 0) && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Alertes stock
                </h2>
                <div className="space-y-2">
                  {outOfStock.slice(0, 5).map((s) => (
                    <div key={s.supply.id} className="flex items-center justify-between text-sm">
                      <Link href={`/fournitures/liste/${s.supply.id}`} className="text-gray-700 hover:text-blue-600 truncate">
                        {s.supply.name}
                      </Link>
                      <Badge variant="destructive" className="ml-2 shrink-0 text-xs">Rupture</Badge>
                    </div>
                  ))}
                  {lowStock.slice(0, 5).map((s) => (
                    <div key={s.supply.id} className="flex items-center justify-between text-sm">
                      <Link href={`/fournitures/liste/${s.supply.id}`} className="text-gray-700 hover:text-blue-600 truncate">
                        {s.supply.name}
                      </Link>
                      <Badge variant="warning" className="ml-2 shrink-0 text-xs">
                        {s.total} {UNIT_LABELS[s.supply.unit] || s.supply.unit}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Link href="/fournitures/etats" className="text-xs text-blue-600 hover:underline mt-3 block">
                  Voir l&apos;état complet →
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Recent entries */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4 text-green-500" />
                Dernières entrées
              </h2>
              {recentEntries.length === 0 ? (
                <p className="text-sm text-gray-400">Aucune entrée validée</p>
              ) : (
                <div className="space-y-2">
                  {recentEntries.map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-sm">
                      <div>
                        <Link href={`/fournitures/entrees/${e.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                          {e.reference}
                        </Link>
                        {e.supplier && <span className="text-gray-500 ml-2 text-xs">{e.supplier.name}</span>}
                      </div>
                      <span className="text-green-700 font-medium text-xs">{formatCurrency(Number(e.totalAmount))}</span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/fournitures/entrees" className="text-xs text-blue-600 hover:underline mt-3 block">
                Voir toutes les entrées →
              </Link>
            </CardContent>
          </Card>

          {/* Recent exits */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 text-purple-500" />
                Dernières sorties
              </h2>
              {recentExits.length === 0 ? (
                <p className="text-sm text-gray-400">Aucune sortie validée</p>
              ) : (
                <div className="space-y-2">
                  {recentExits.map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-sm">
                      <Link href={`/fournitures/sorties/${e.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                        {e.reference}
                      </Link>
                      <span className="text-xs text-gray-500">{e.destination.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/fournitures/sorties" className="text-xs text-blue-600 hover:underline mt-3 block">
                Voir toutes les sorties →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
