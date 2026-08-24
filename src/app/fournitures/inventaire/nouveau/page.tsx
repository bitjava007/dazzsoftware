import { prisma } from "@/lib/prisma";
import { createInventorySession } from "@/actions/stock-inventaire";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NouvelInventairePage() {
  const locations = await prisma.stockLocation.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/fournitures/inventaire"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Nouvel inventaire</h1>
        </div>

        <p className="text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          L&apos;inventaire chargera automatiquement le stock théorique actuel pour chaque fourniture de l&apos;emplacement sélectionné.
        </p>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4"><CardTitle className="text-base">Paramètres de l&apos;inventaire</CardTitle></CardHeader>
          <CardContent>
            <form action={createInventorySession} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="date">Date *</Label>
                <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="locationId">Emplacement</Label>
                <Select name="locationId">
                  <SelectTrigger><SelectValue placeholder="Tous les emplacements" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Laissez vide pour inventorier tous les emplacements</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comment">Commentaire</Label>
                <Input id="comment" name="comment" placeholder="Commentaire optionnel" />
              </div>
              <Button type="submit" className="w-full">Démarrer l&apos;inventaire</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
