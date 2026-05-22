"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClientAction } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

export default function NouveauClientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [country, setCountry] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    if (country) formData.set("country", country);

    const result = await createClientAction(formData);
    setIsLoading(false);

    if (result.error) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Client créé avec succès" });
      router.push("/clients");
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/clients"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">Nouveau client</h1>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Informations du client</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="fullName">Nom complet *</Label>
              <Input id="fullName" name="fullName" required placeholder="Ex: Amina Diallo" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" name="phone" placeholder="+243..." />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="whatsappNumber">Numéro WhatsApp</Label>
                <Input id="whatsappNumber" name="whatsappNumber" placeholder="+243..." />
              </div>
              <div className="space-y-1 flex flex-col justify-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name="notificationOptIn" value="true" defaultChecked className="rounded" />
                  <span>Accepte les notifications</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Pays</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un pays" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="city">Ville</Label>
                <Input id="city" name="city" placeholder="Kinshasa" />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" name="address" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création...</> : "Créer le client"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/clients">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
