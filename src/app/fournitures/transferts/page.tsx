import { prisma } from "@/lib/prisma";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

const STATUS_LABELS = { draft: "Brouillon", shipped: "Expédié", received: "Reçu", cancelled: "Annulé" };
const STATUS_VARIANTS = { draft: "secondary", shipped: "warning", received: "success", cancelled: "destructive" } as const;

export default async function TransfertsPage() {
  const transfers = await prisma.stockTransfer.findMany({
    include: { fromLocation: true, toLocation: true, _count: { select: { lines: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transferts</h1>
            <p className="text-sm text-gray-500 mt-1">{transfers.length} transfert{transfers.length !== 1 ? "s" : ""}</p>
          </div>
          <Button asChild>
            <Link href="/fournitures/transferts/nouveau"><Plus className="w-4 h-4 mr-2" />Nouveau transfert</Link>
          </Button>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Trajet</TableHead>
                  <TableHead>Lignes</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-gray-400">Aucun transfert</TableCell></TableRow>
                ) : transfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell><Link href={`/fournitures/transferts/${t.id}`} className="font-mono text-xs text-blue-600 hover:underline">{t.reference}</Link></TableCell>
                    <TableCell className="text-sm">{formatDate(t.date)}</TableCell>
                    <TableCell className="text-sm flex items-center gap-1">{t.fromLocation.name}<ArrowRight className="w-3 h-3 text-gray-400" />{t.toLocation.name}</TableCell>
                    <TableCell className="text-sm">{t._count.lines}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANTS[t.status]}>{STATUS_LABELS[t.status]}</Badge></TableCell>
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
