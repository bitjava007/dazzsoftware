import { prisma } from "@/lib/prisma";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function FournisseursPage() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fournisseurs</h1>
            <p className="text-sm text-gray-500 mt-1">{suppliers.length} fournisseur{suppliers.length !== 1 ? "s" : ""}</p>
          </div>
          <Button asChild>
            <Link href="/fournitures/fournisseurs/nouveau"><Plus className="w-4 h-4 mr-2" />Nouveau fournisseur</Link>
          </Button>
        </div>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-gray-400">Aucun fournisseur</TableCell></TableRow>
                ) : suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-sm">{s.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{s.phone ?? s.whatsappNumber ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{s.email ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{[s.city, s.country].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell><Badge variant={s.isActive ? "success" : "secondary"}>{s.isActive ? "Actif" : "Inactif"}</Badge></TableCell>
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
