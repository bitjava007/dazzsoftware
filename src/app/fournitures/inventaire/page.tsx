import { prisma } from "@/lib/prisma";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

const STATUS_LABELS = { draft: "Brouillon", in_progress: "En cours", validated: "Validé", cancelled: "Annulé" };
const STATUS_VARIANTS = { draft: "secondary", in_progress: "warning", validated: "success", cancelled: "destructive" } as const;

export default async function InventairePage() {
  const sessions = await prisma.inventorySession.findMany({
    include: { location: true, createdBy: true, _count: { select: { lines: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventaires</h1>
            <p className="text-sm text-gray-500 mt-1">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</p>
          </div>
          <Button asChild>
            <Link href="/fournitures/inventaire/nouveau"><Plus className="w-4 h-4 mr-2" />Nouvel inventaire</Link>
          </Button>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Emplacement</TableHead>
                  <TableHead>Lignes</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-gray-400">Aucun inventaire</TableCell></TableRow>
                ) : sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell><Link href={`/fournitures/inventaire/${s.id}`} className="font-mono text-xs text-blue-600 hover:underline">{s.reference}</Link></TableCell>
                    <TableCell className="text-sm">{formatDate(s.date)}</TableCell>
                    <TableCell className="text-sm">{s.location?.name ?? "Tous emplacements"}</TableCell>
                    <TableCell className="text-sm">{s._count.lines}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANTS[s.status]}>{STATUS_LABELS[s.status]}</Badge></TableCell>
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
