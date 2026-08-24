import { prisma } from "@/lib/prisma";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function EmplacementsPage() {
  const locations = await prisma.stockLocation.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Emplacements</h1>
            <p className="text-sm text-gray-500 mt-1">{locations.length} emplacement{locations.length !== 1 ? "s" : ""}</p>
          </div>
          <Button asChild>
            <Link href="/fournitures/emplacements/nouveau"><Plus className="w-4 h-4 mr-2" />Nouvel emplacement</Link>
          </Button>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-10 text-gray-400">Aucun emplacement</TableCell></TableRow>
                ) : locations.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium text-sm">{l.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{l.description ?? "—"}</TableCell>
                    <TableCell><Badge variant={l.isActive ? "success" : "secondary"}>{l.isActive ? "Actif" : "Inactif"}</Badge></TableCell>
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
