"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createMeasurementAction } from "@/actions/measurements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Client { id: string; fullName: string; }

const FIELDS: { name: string; label: string }[] = [
  { name: "chest", label: "Poitrine (cm)" },
  { name: "waist", label: "Taille (cm)" },
  { name: "hips", label: "Hanches (cm)" },
  { name: "shoulders", label: "Épaules (cm)" },
  { name: "armLength", label: "Long. bras (cm)" },
  { name: "neck", label: "Cou (cm)" },
  { name: "shirtLength", label: "Long. chemise (cm)" },
  { name: "trouserLength", label: "Long. pantalon (cm)" },
  { name: "dressLength", label: "Long. robe (cm)" },
  { name: "wrist", label: "Poignet (cm)" },
  { name: "thigh", label: "Cuisse (cm)" },
  { name: "knee", label: "Genou (cm)" },
  { name: "ankle", label: "Cheville (cm)" },
  { name: "inseam", label: "Entrejambe (cm)" },
];

export default function NouvellesMesuresPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(searchParams.get("clientId") ?? "");

  useEffect(() => {
    fetch("/api/data/clients")
      .then((r) => r.json())
      .then(setClients)
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!clientId) {
      toast({ title: "Sélectionnez un client", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("clientId", clientId);

    const result = await createMeasurementAction(formData);
    setIsLoading(false);

    if (result.error) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Mesures enregistrées" });
      if (clientId) {
        router.push(`/clients/${clientId}`);
      } else {
        router.push("/mesures");
      }
    }
  };

  const backHref = clientId ? `/clients/${clientId}` : "/mesures";

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref}><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">Nouvelles mesures</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Informations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="profileName">Nom du profil</Label>
              <Input id="profileName" name="profileName" placeholder="Ex: Tenue de cérémonie" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Mensurations</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {FIELDS.map(({ name, label }) => (
                <div key={name} className="space-y-1">
                  <Label htmlFor={name} className="text-xs">{label}</Label>
                  <Input
                    id={name}
                    name={name}
                    type="number"
                    step="0.5"
                    min="0"
                    className="h-8 text-sm"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} placeholder="Observations particulières..." />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</> : "Enregistrer les mesures"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={backHref}>Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
