import { createLocation } from "@/actions/fournitures";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NouvelEmplacementPage() {
  return (
    <div>
      <FournituresNav />
      <div className="p-4 sm:p-6 max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/fournitures/emplacements"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Nouvel emplacement</h1>
        </div>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4"><CardTitle className="text-base">Informations de l&apos;emplacement</CardTitle></CardHeader>
          <CardContent>
            <form action={createLocation} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nom *</Label>
                <Input id="name" name="name" required placeholder="Ex : Dépôt principal, Atelier, Boutique..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="Description optionnelle" />
              </div>
              <Button type="submit" className="w-full">Créer l&apos;emplacement</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
