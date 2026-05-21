"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClientAction } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const schema = z.object({
  fullName: z.string().min(2, "Le nom est obligatoire"),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NouveauClientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value) formData.set(key, value);
    });

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
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/clients">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Nouveau client</h1>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Informations du client</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="fullName">Nom complet *</Label>
                <Input id="fullName" {...register("fullName")} placeholder="Jean Dupont" />
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" {...register("phone")} placeholder="+243 00 000 0000" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} placeholder="client@email.com" />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="country">Pays</Label>
                <Input id="country" {...register("country")} placeholder="RDC" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="city">Ville</Label>
                <Input id="city" {...register("city")} placeholder="Kinshasa" />
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" {...register("address")} placeholder="Avenue..." />
              </div>

              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" {...register("notes")} placeholder="Informations complémentaires..." rows={3} />
              </div>
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
