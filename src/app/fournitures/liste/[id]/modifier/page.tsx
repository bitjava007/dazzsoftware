import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateSupply } from "@/actions/fournitures";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const UNITS = [
  { value: "piece", label: "Pièce" }, { value: "metre", label: "Mètre" },
  { value: "centimetre", label: "Centimètre" }, { value: "bobine", label: "Bobine" },
  { value: "rouleau", label: "Rouleau" }, { value: "kilogramme", label: "Kilogramme" },
  { value: "gramme", label: "Gramme" }, { value: "litre", label: "Litre" },
  { value: "paquet", label: "Paquet" }, { value: "boite", label: "Boîte" },
  { value: "autre", label: "Autre" },
];

export default async function ModifierFourniturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [supply, categories, suppliers, locations] = await Promise.all([
    prisma.supply.findUnique({ where: { id: id } }),
    prisma.supplyCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.stockLocation.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!supply) notFound();

  const action = updateSupply.bind(null, id);

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/fournitures/liste/${id}`}><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Modifier la fourniture</h1>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4"><CardTitle className="text-base">{supply.name}</CardTitle></CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="name">Nom *</Label>
                  <Input id="name" name="name" defaultValue={supply.name} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit">Unité *</Label>
                  <Select name="unit" defaultValue={supply.unit} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="categoryId">Catégorie</Label>
                  <Select name="categoryId" defaultValue={supply.categoryId ?? ""}>
                    <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="minimumStock">Stock minimum</Label>
                  <Input id="minimumStock" name="minimumStock" type="number" min="0" step="0.001" defaultValue={Number(supply.minimumStock)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="referencePrice">Prix de référence (XOF)</Label>
                  <Input id="referencePrice" name="referencePrice" type="number" min="0" step="0.01" defaultValue={supply.referencePrice ? Number(supply.referencePrice) : ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="defaultSupplierId">Fournisseur par défaut</Label>
                  <Select name="defaultSupplierId" defaultValue={supply.defaultSupplierId ?? ""}>
                    <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="defaultLocationId">Emplacement par défaut</Label>
                  <Select name="defaultLocationId" defaultValue={supply.defaultLocationId ?? ""}>
                    <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="isActive">Statut</Label>
                  <Select name="isActive" defaultValue={supply.isActive ? "true" : "false"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Actif</SelectItem>
                      <SelectItem value="false">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={3} defaultValue={supply.description ?? ""} />
                </div>
              </div>
              <Button type="submit" className="w-full">Enregistrer les modifications</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
