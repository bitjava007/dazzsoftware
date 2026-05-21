"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import Link from "next/link";
import { updateClientAction } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

interface Client {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  notes: string | null;
}

export default function ModifierClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [country, setCountry] = useState("");

  useEffect(() => {
    fetch(`/api/data/clients/${id}`)
      .then((r) => r.json())
      .then((data: Client) => {
        setClient(data);
        setCountry(data.country ?? "");
      })
      .catch(console.error);
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    if (country) formData.set("country", country);

    const result = await updateClientAction(id, formData);
    setIsLoading(false);

    if (result.error) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Client modifié avec succès" });
      router.push(`/clients/${id}`);
    }
  };

  if (!client) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/clients/${id}`}><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">Modifier le client</h1>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Informations du client</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="fullName">Nom complet *</Label>
              <Input id="fullName" name="fullName" defaultValue={client.fullName} required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" name="phone" defaultValue={client.phone ?? ""} placeholder="+243..." />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={client.email ?? ""} />
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
                <Input id="city" name="city" defaultValue={client.city ?? ""} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" name="address" defaultValue={client.address ?? ""} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} defaultValue={client.notes ?? ""} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sauvegarde...</> : "Sauvegarder"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/clients/${id}`}>Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
