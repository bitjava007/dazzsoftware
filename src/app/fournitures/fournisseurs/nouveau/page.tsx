import { createSupplier } from "@/actions/fournisseurs";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NouveauFournisseurPage() {
  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/fournitures/fournisseurs"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau fournisseur</h1>
        </div>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4"><CardTitle className="text-base">Informations du fournisseur</CardTitle></CardHeader>
          <CardContent>
            <form action={createSupplier} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nom *</Label>
                <Input id="name" name="name" required placeholder="Nom du fournisseur" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input id="phone" name="phone" placeholder="+243 ..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="whatsappNumber">WhatsApp</Label>
                  <Input id="whatsappNumber" name="whatsappNumber" placeholder="+243 ..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="email@fournisseur.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city">Ville</Label>
                  <Input id="city" name="city" placeholder="Kinshasa" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Pays</Label>
                  <Input id="country" name="country" placeholder="RDC" defaultValue="RDC" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" name="address" placeholder="Adresse complète" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" placeholder="Informations complémentaires" />
              </div>
              <Button type="submit" className="w-full">Créer le fournisseur</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
