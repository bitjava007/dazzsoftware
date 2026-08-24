"use client";

import { useState, useTransition } from "react";
import { createStockExit } from "@/actions/stock-sorties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

const UNIT_LABELS: Record<string, string> = {
  piece: "pcs", metre: "m", centimetre: "cm", bobine: "bob.", rouleau: "rou.",
  kilogramme: "kg", gramme: "g", litre: "L", paquet: "pqt", boite: "bte", autre: "—",
};

const DESTINATIONS = [
  { value: "atelier_couture", label: "Atelier couture" },
  { value: "boutique", label: "Boutique" },
  { value: "depot", label: "Dépôt" },
  { value: "perte_dommage", label: "Perte / Dommage" },
  { value: "autre", label: "Autre" },
];

const REASONS = [
  { value: "consommation_production", label: "Consommation production" },
  { value: "reparation", label: "Réparation" },
  { value: "echantillon", label: "Échantillon" },
  { value: "perte", label: "Perte" },
  { value: "dommage", label: "Dommage" },
  { value: "don", label: "Don" },
  { value: "ajustement", label: "Ajustement" },
  { value: "autre", label: "Autre" },
];

type Supply = { id: string; name: string; unit: string; code: string };
type Location = { id: string; name: string };
type Balance = { supplyId: string; locationId: string; quantity: unknown };
interface Line { supplyId: string; locationId: string; quantity: string }

export function SortieForm({ supplies, locations, balances }: { supplies: Supply[]; locations: Location[]; balances: Balance[] }) {
  const [lines, setLines] = useState<Line[]>([{ supplyId: "", locationId: "", quantity: "" }]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const addLine = () => setLines((l) => [...l, { supplyId: "", locationId: "", quantity: "" }]);
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, key: keyof Line, val: string) =>
    setLines((l) => l.map((x, idx) => idx === i ? { ...x, [key]: val } : x));

  const getAvailable = (supplyId: string, locationId: string) => {
    const b = balances.find((b) => b.supplyId === supplyId && b.locationId === locationId);
    return b ? Number(b.quantity) : 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const parsedLines = lines.map((l) => ({
      supplyId: l.supplyId,
      locationId: l.locationId,
      quantity: parseFloat(l.quantity),
    }));
    if (parsedLines.some((l) => !l.supplyId || !l.locationId || isNaN(l.quantity) || l.quantity <= 0)) {
      setError("Toutes les lignes doivent être complètes avec une quantité positive");
      return;
    }
    fd.set("lines", JSON.stringify(parsedLines));
    startTransition(async () => {
      try {
        await createStockExit(fd);
      } catch (err: unknown) {
        if (err instanceof Error && !err.message.includes("NEXT_REDIRECT")) {
          setError(err.message);
        }
      }
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/fournitures/sorties"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle sortie de stock</h1>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">En-tête</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="destination">Destination *</Label>
              <Select name="destination" required>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{DESTINATIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Motif *</Label>
              <Select name="reason" required>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>{REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="externalRef">Référence externe</Label>
              <Input id="externalRef" name="externalRef" placeholder="Ex: Atelier semaine 34" />
            </div>
            <div className="col-span-full space-y-1.5">
              <Label htmlFor="comment">Commentaire</Label>
              <Input id="comment" name="comment" placeholder="Commentaire optionnel" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Fournitures à sortir</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-3.5 h-3.5 mr-1" />Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line, i) => {
              const supply = supplies.find((s) => s.id === line.supplyId);
              const available = line.supplyId && line.locationId ? getAvailable(line.supplyId, line.locationId) : null;
              return (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <Select value={line.supplyId} onValueChange={(v) => updateLine(i, "supplyId", v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Fourniture" /></SelectTrigger>
                      <SelectContent>{supplies.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Select value={line.locationId} onValueChange={(v) => updateLine(i, "locationId", v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Emplacement" /></SelectTrigger>
                      <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                    {available !== null && <p className="text-xs text-gray-400 mt-0.5">Disponible : {available.toLocaleString("fr-FR")} {supply ? UNIT_LABELS[supply.unit] : ""}</p>}
                  </div>
                  <div className="col-span-3">
                    <Input className="h-9" type="number" min="0.001" step="0.001" placeholder="Qté"
                      value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Création..." : "Créer la sortie (brouillon)"}
        </Button>
      </form>
    </div>
  );
}
