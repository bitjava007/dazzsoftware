import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateSupplier } from "@/actions/fournisseurs";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ModifierFournisseurPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();

  const action = updateSupplier.bind(null, id);

  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/fournitures/fournisseurs"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Modifier le fournisseur</h1>
        </div>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4"><CardTitle className="text-base">{supplier.name}</CardTitle></CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nom *</Label>
                <Input id="name" name="name" required defaultValue={supplier.name} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input id="phone" name="phone" defaultValue={supplier.phone ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="whatsappNumber">WhatsApp</Label>
                  <Input id="whatsappNumber" name="whatsappNumber" defaultValue={supplier.whatsappNumber ?? ""} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={supplier.email ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactName">Personne de contact</Label>
                <Input id="contactName" name="contactName" defaultValue={supplier.contactName ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city">Ville</Label>
                  <Input id="city" name="city" defaultValue={supplier.city ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Pays</Label>
                  <Input id="country" name="country" defaultValue={supplier.country ?? ""} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" name="address" defaultValue={supplier.address ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" defaultValue={supplier.notes ?? ""} />
              </div>
              {/* Preserve isActive value through the edit form */}
              <input type="hidden" name="isActive" value={String(supplier.isActive)} />
              <Button type="submit" className="w-full">Enregistrer les modifications</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
