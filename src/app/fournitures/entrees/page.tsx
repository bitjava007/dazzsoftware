import { prisma } from "@/lib/prisma";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

const STATUS_LABELS = { draft: "Brouillon", validated: "Validé", cancelled: "Annulé" };
const STATUS_VARIANTS = { draft: "secondary", validated: "success", cancelled: "destructive" } as const;

export default async function EntreesPage() {
  const entries = await prisma.stockEntry.findMany({
    include: { supplier: true, createdBy: true, _count: { select: { lines: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Entrées de stock</h1>
            <p className="text-sm text-gray-500 mt-1">{entries.length} entrée{entries.length !== 1 ? "s" : ""}</p>
          </div>
          <Button asChild>
            <Link href="/fournitures/entrees/nouvelle"><Plus className="w-4 h-4 mr-2" />Nouvelle entrée</Link>
          </Button>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Lignes</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-400">Aucune entrée</TableCell></TableRow>
                ) : entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link href={`/fournitures/entrees/${e.id}`} className="font-mono text-xs text-blue-600 hover:underline">{e.reference}</Link>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                    <TableCell className="text-sm">{e.supplier?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{e._count.lines}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(Number(e.totalAmount))}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANTS[e.status]}>{STATUS_LABELS[e.status]}</Badge></TableCell>
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
