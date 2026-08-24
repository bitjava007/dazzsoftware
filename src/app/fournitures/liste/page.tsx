import { prisma } from "@/lib/prisma";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { prisma as db } from "@/lib/prisma";

const UNIT_LABELS: Record<string, string> = {
  piece: "pcs", metre: "m", centimetre: "cm", bobine: "bobine",
  rouleau: "rouleau", kilogramme: "kg", gramme: "g", litre: "L",
  paquet: "paquet", boite: "boîte", autre: "—",
};

export default async function ListeFournituresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user ? await db.profile.findUnique({ where: { id: user.id }, select: { role: true } }) : null;
  const canCreate = profile?.role === "admin" || profile?.role === "manager";

  const [supplies, balances] = await Promise.all([
    prisma.supply.findMany({
      include: { category: true, defaultLocation: true },
      orderBy: { name: "asc" },
    }),
    prisma.stockBalance.groupBy({
      by: ["supplyId"],
      _sum: { quantity: true },
    }),
  ]);

  const balanceMap = new Map(balances.map((b) => [b.supplyId, Number(b._sum.quantity ?? 0)]));

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fournitures</h1>
            <p className="text-sm text-gray-500 mt-1">{supplies.length} fourniture{supplies.length !== 1 ? "s" : ""}</p>
          </div>
          {canCreate && (
            <Button asChild>
              <Link href="/fournitures/liste/nouveau">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle fourniture
              </Link>
            </Button>
          )}
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead className="text-right">Stock total</TableHead>
                  <TableHead className="text-right">Stock min.</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                      Aucune fourniture enregistrée
                    </TableCell>
                  </TableRow>
                ) : (
                  supplies.map((s) => {
                    const total = balanceMap.get(s.id) ?? 0;
                    const min = Number(s.minimumStock);
                    const status = total === 0 ? "rupture" : total <= min ? "faible" : "normal";
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs text-gray-500">{s.code}</TableCell>
                        <TableCell>
                          <Link href={`/fournitures/liste/${s.id}`} className="font-medium text-sm hover:text-blue-600">
                            {s.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{s.category?.name ?? "—"}</TableCell>
                        <TableCell className="text-sm">{UNIT_LABELS[s.unit] ?? s.unit}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{total.toLocaleString("fr-FR")}</TableCell>
                        <TableCell className="text-right text-sm text-gray-500">{min > 0 ? min.toLocaleString("fr-FR") : "—"}</TableCell>
                        <TableCell>
                          {status === "rupture" && <Badge variant="destructive">Rupture</Badge>}
                          {status === "faible" && <Badge variant="warning">Faible</Badge>}
                          {status === "normal" && <Badge variant="success">Normal</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
