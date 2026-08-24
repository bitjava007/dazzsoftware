import { prisma } from "@/lib/prisma";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

const STATUS_LABELS = { draft: "Brouillon", validated: "Validé", cancelled: "Annulé" };
const STATUS_VARIANTS = { draft: "secondary", validated: "success", cancelled: "destructive" } as const;
const DEST_LABELS: Record<string, string> = {
  atelier_couture: "Atelier couture", boutique: "Boutique", depot: "Dépôt",
  autre: "Autre", perte_dommage: "Perte/Dommage",
};

export default async function SortiesPage() {
  const exits = await prisma.stockExit.findMany({
    include: { createdBy: true, _count: { select: { lines: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sorties de stock</h1>
            <p className="text-sm text-gray-500 mt-1">{exits.length} sortie{exits.length !== 1 ? "s" : ""}</p>
          </div>
          <Button asChild>
            <Link href="/fournitures/sorties/nouvelle"><Plus className="w-4 h-4 mr-2" />Nouvelle sortie</Link>
          </Button>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Lignes</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exits.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-gray-400">Aucune sortie</TableCell></TableRow>
                ) : exits.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell><Link href={`/fournitures/sorties/${e.id}`} className="font-mono text-xs text-blue-600 hover:underline">{e.reference}</Link></TableCell>
                    <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                    <TableCell className="text-sm">{DEST_LABELS[e.destination] ?? e.destination}</TableCell>
                    <TableCell className="text-sm">{e._count.lines}</TableCell>
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
