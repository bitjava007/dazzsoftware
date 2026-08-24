import { prisma } from "@/lib/prisma";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

const REASON_LABELS: Record<string, string> = {
  damage: "Dommage",
  loss: "Perte",
  expiry: "Péremption",
  count_error: "Erreur de comptage",
  production_use: "Usage production",
  other: "Autre",
};

export default async function AjustementsPage() {
  const adjustments = await prisma.stockAdjustment.findMany({
    include: {
      createdBy: true,
      lines: { include: { supply: true, location: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ajustements de stock</h1>
          <p className="text-sm text-gray-500 mt-1">{adjustments.length} ajustement{adjustments.length !== 1 ? "s" : ""}</p>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Lignes</TableHead>
                  <TableHead>Commentaire</TableHead>
                  <TableHead>Par</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-gray-400">Aucun ajustement</TableCell></TableRow>
                ) : adjustments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.reference}</TableCell>
                    <TableCell className="text-sm">{formatDate(a.date)}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{REASON_LABELS[a.reason] ?? a.reason}</Badge></TableCell>
                    <TableCell className="text-sm">{a.lines.length} ligne{a.lines.length !== 1 ? "s" : ""}</TableCell>
                    <TableCell className="text-sm text-gray-500">{a.comment ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{a.createdBy?.fullName ?? "—"}</TableCell>
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
