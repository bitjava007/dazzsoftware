"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { updateOrderAction } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";

interface Article { id: string; name: string; indicativePrice: number | null; }
interface Currency { id: string; code: string; symbol: string; }
interface Client { id: string; fullName: string; }

interface OrderLine {
  articleId: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface OrderData {
  id: string;
  orderNumber: string;
  clientId: string;
  currencyId: string;
  orderDate: string | null;
  expectedDeliveryDate: string | null;
  orderDetails: string | null;
  discount: number;
  bonus: number;
  lines: { articleId: string | null; description: string | null; quantity: number; unitPrice: number }[];
}

export default function ModifierCommandePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [clientId, setClientId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([{ articleId: "", description: "", quantity: 1, unitPrice: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [orderDate, setOrderDate] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [orderDetails, setOrderDetails] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/data/clients").then((r) => r.json()),
      fetch("/api/data/articles").then((r) => r.json()),
      fetch("/api/data/currencies").then((r) => r.json()),
      fetch(`/api/data/orders/${id}`).then((r) => r.json()),
    ]).then(([c, a, cu, order]: [Client[], Article[], Currency[], OrderData]) => {
      setClients(c);
      setArticles(a);
      setCurrencies(cu);
      setClientId(order.clientId);
      setCurrencyId(order.currencyId);
      setDiscount(order.discount ?? 0);
      setBonus(order.bonus ?? 0);
      setOrderDate(order.orderDate ? order.orderDate.split("T")[0] : "");
      setExpectedDeliveryDate(order.expectedDeliveryDate ? order.expectedDeliveryDate.split("T")[0] : "");
      setOrderDetails(order.orderDetails ?? "");
      setOrderNumber(order.orderNumber);
      if (order.lines.length > 0) {
        setLines(order.lines.map((l) => ({
          articleId: l.articleId ?? "",
          description: l.description ?? "",
          quantity: l.quantity,
          unitPrice: Number(l.unitPrice),
        })));
      }
      setIsFetching(false);
    }).catch(() => {
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
      setIsFetching(false);
    });
  }, [id, toast]);

  const addLine = () => setLines([...lines, { articleId: "", description: "", quantity: 1, unitPrice: 0 }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof OrderLine, value: string | number) => {
    setLines(lines.map((l, idx) => {
      if (idx !== i) return l;
      const updated = { ...l, [field]: value };
      if (field === "articleId") {
        const art = articles.find((a) => a.id === value);
        if (art?.indicativePrice) updated.unitPrice = art.indicativePrice;
        updated.description = art?.name ?? "";
      }
      return updated;
    }));
  };

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const total = Math.max(0, subtotal - discount - bonus);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!clientId) { toast({ title: "Sélectionnez un client", variant: "destructive" }); return; }
    if (!currencyId) { toast({ title: "Sélectionnez une devise", variant: "destructive" }); return; }
    if (lines.some((l) => l.unitPrice <= 0)) {
      toast({ title: "Vérifiez les prix", description: "Chaque ligne doit avoir un prix positif", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("clientId", clientId);
    formData.set("currencyId", currencyId);
    formData.set("discount", String(discount));
    formData.set("bonus", String(bonus));
    formData.set("lines", JSON.stringify(lines));

    const result = await updateOrderAction(id, formData);
    setIsLoading(false);

    if (result.error) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Commande modifiée avec succès" });
      router.push(`/commandes/${id}`);
    }
  };

  if (isFetching) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/commandes/${id}`}><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold">Modifier commande {orderNumber}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Client & Currency */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Label>Devise *</Label>
                <Select value={currencyId} onValueChange={setCurrencyId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner une devise" /></SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.symbol}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="orderDate">Date de commande</Label>
                <Input
                  id="orderDate"
                  name="orderDate"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="expectedDeliveryDate">Date de livraison prévue</Label>
                <Input
                  id="expectedDeliveryDate"
                  name="expectedDeliveryDate"
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="orderDetails">Détails / Description</Label>
              <Textarea
                id="orderDetails"
                name="orderDetails"
                rows={3}
                value={orderDetails}
                onChange={(e) => setOrderDetails(e.target.value)}
                placeholder="Tissu, couleurs, modèle..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Lines */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Articles commandés</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addLine}>
              <Plus className="w-4 h-4 mr-1" />Ajouter une ligne
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg">
                <div className="col-span-12 sm:col-span-4 space-y-1">
                  <Label className="text-xs">Article</Label>
                  <Select value={line.articleId} onValueChange={(v) => updateLine(i, "articleId", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      {articles.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-12 sm:col-span-3 space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    className="h-8 text-sm"
                    value={line.description}
                    onChange={(e) => updateLine(i, "description", e.target.value)}
                    placeholder="Détails..."
                  />
                </div>
                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <Label className="text-xs">Qté</Label>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => updateLine(i, "quantity", parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="col-span-6 sm:col-span-2 space-y-1">
                  <Label className="text-xs">Prix unit.</Label>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.unitPrice || ""}
                    onChange={(e) => updateLine(i, "unitPrice", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  {lines.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" className="text-red-500 h-8 w-8 p-0" onClick={() => removeLine(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="col-span-12 text-right text-xs text-gray-500">
                  Sous-total: <span className="font-semibold">{(line.quantity * line.unitPrice).toLocaleString("fr-FR")}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Sous-total</span>
              <span className="font-semibold">{subtotal.toLocaleString("fr-FR")}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label className="text-sm text-gray-500 shrink-0">Remise</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discount || ""}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-32 h-8 text-sm text-right"
                placeholder="0"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label className="text-sm text-gray-500 shrink-0">Bonus</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={bonus || ""}
                onChange={(e) => setBonus(parseFloat(e.target.value) || 0)}
                className="w-32 h-8 text-sm text-right"
                placeholder="0"
              />
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-blue-700">{total.toLocaleString("fr-FR")}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Modification...</> : "Enregistrer les modifications"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/commandes/${id}`}>Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
