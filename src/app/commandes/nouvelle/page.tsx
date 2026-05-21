"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createOrderAction } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const schema = z.object({
  orderDetails: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  sellingPrice: z.string().min(1, "Le prix est obligatoire"),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NouvelleCommandePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<{ id: string; fullName: string }[]>([]);
  const [articles, setArticles] = useState<{ id: string; name: string; indicativePrice: number | null }[]>([]);
  const [currencies, setCurrencies] = useState<{ id: string; code: string; symbol: string }[]>([]);
  const [clientId, setClientId] = useState("");
  const [articleId, setArticleId] = useState("");
  const [currencyId, setCurrencyId] = useState("");

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      orderDate: new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, articlesRes, currenciesRes] = await Promise.all([
          fetch("/api/data/clients"),
          fetch("/api/data/articles"),
          fetch("/api/data/currencies"),
        ]);
        if (clientsRes.ok) setClients(await clientsRes.json());
        if (articlesRes.ok) setArticles(await articlesRes.json());
        if (currenciesRes.ok) setCurrencies(await currenciesRes.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  const handleArticleChange = (id: string) => {
    setArticleId(id);
    const article = articles.find((a) => a.id === id);
    if (article?.indicativePrice) {
      setValue("sellingPrice", String(article.indicativePrice));
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!clientId) { toast({ title: "Sélectionnez un client", variant: "destructive" }); return; }
    if (!currencyId) { toast({ title: "Sélectionnez une devise", variant: "destructive" }); return; }

    setIsLoading(true);
    const formData = new FormData();
    formData.set("clientId", clientId);
    if (articleId) formData.set("articleId", articleId);
    formData.set("currencyId", currencyId);
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== "") formData.set(key, String(value));
    });

    const result = await createOrderAction(formData);
    setIsLoading(false);

    if (result.error) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Commande créée avec succès" });
      router.push("/commandes");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/commandes"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
        </Button>
        <h1 className="text-2xl font-bold">Nouvelle commande</h1>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Détails de la commande</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <Label>Client *</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Article</Label>
                <Select value={articleId} onValueChange={handleArticleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un article" />
                  </SelectTrigger>
                  <SelectContent>
                    {articles.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Devise *</Label>
                <Select value={currencyId} onValueChange={setCurrencyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une devise" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.code} — {c.symbol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="sellingPrice">Prix de vente *</Label>
                <Input id="sellingPrice" type="number" step="0.01" min="0" {...register("sellingPrice")} />
                {errors.sellingPrice && <p className="text-xs text-red-500">{errors.sellingPrice.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="orderDate">Date de commande</Label>
                <Input id="orderDate" type="date" {...register("orderDate")} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="expectedDeliveryDate">Date de livraison prévue</Label>
                <Input id="expectedDeliveryDate" type="date" {...register("expectedDeliveryDate")} />
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
                <Label htmlFor="orderDetails">Détails de la commande</Label>
                <Textarea id="orderDetails" {...register("orderDetails")} rows={4} placeholder="Description du modèle, tissu, couleurs, spécifications..." />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création...</> : "Créer la commande"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/commandes">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
