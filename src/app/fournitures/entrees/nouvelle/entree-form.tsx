"use client";

import { useState, useTransition } from "react";
import { createStockEntry } from "@/actions/stock-entrees";
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

type Supply = { id: string; name: string; unit: string; code: string };
type Supplier = { id: string; name: string };
type Location = { id: string; name: string };

interface Line { supplyId: string; locationId: string; quantity: string; unitCost: string }

export function EntreeForm({ supplies, suppliers, locations }: { supplies: Supply[]; suppliers: Supplier[]; locations: Location[] }) {
  const [lines, setLines] = useState<Line[]>([{ supplyId: "", locationId: "", quantity: "", unitCost: "" }]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const addLine = () => setLines((l) => [...l, { supplyId: "", locationId: "", quantity: "", unitCost: "" }]);
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, key: keyof Line, val: string) =>
    setLines((l) => l.map((x, idx) => idx === i ? { ...x, [key]: val } : x));

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const parsedLines = lines.map((l) => ({
      supplyId: l.supplyId,
      locationId: l.locationId,
      quantity: parseFloat(l.quantity),
      unitCost: parseFloat(l.unitCost),
    }));
    if (parsedLines.some((l) => !l.supplyId || !l.locationId || isNaN(l.quantity) || isNaN(l.unitCost))) {
      setError("Toutes les lignes doivent être complètes");
      return;
    }
    fd.set("lines", JSON.stringify(parsedLines));
    startTransition(async () => {
      try {
        await createStockEntry(fd);
      } catch (err: unknown) {
        if (err instanceof Error && !err.message.includes("NEXT_REDIRECT")) {
          setError(err.message);
        }
      }
    });
  };

  const totalAmount = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitCost) || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/fournitures/entrees"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle entrée de stock</h1>
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
              <Label htmlFor="supplierId">Fournisseur</Label>
              <Select name="supplierId">
                <SelectTrigger><SelectValue placeholder="Choisir un fournisseur" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supplierInvoice">N° Facture fournisseur</Label>
              <Input id="supplierInvoice" name="supplierInvoice" placeholder="Ex: FACT-001" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comment">Commentaire</Label>
              <Input id="comment" name="comment" placeholder="Commentaire optionnel" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Fournitures reçues</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-3.5 h-3.5 mr-1" />Ajouter une ligne
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 px-1">
              <span className="col-span-4">Fourniture</span>
              <span className="col-span-3">Emplacement</span>
              <span className="col-span-2">Quantité</span>
              <span className="col-span-2">Prix unit.</span>
              <span className="col-span-1"></span>
            </div>
            {lines.map((line, i) => {
              const supply = supplies.find((s) => s.id === line.supplyId);
              return (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <Select value={line.supplyId} onValueChange={(v) => updateLine(i, "supplyId", v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Fourniture" /></SelectTrigger>
                      <SelectContent>
                        {supplies.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Select value={line.locationId} onValueChange={(v) => updateLine(i, "locationId", v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Emplacement" /></SelectTrigger>
                      <SelectContent>
                        {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input className="h-9" type="number" min="0.001" step="0.001" placeholder="0"
                      value={line.quantity} onChange={(e) => updateLine(i, "quantity", e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <div className="relative">
                      <Input className="h-9 pr-8" type="number" min="0" step="0.01" placeholder="0"
                        value={line.unitCost} onChange={(e) => updateLine(i, "unitCost", e.target.value)} />
                      {supply && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">{UNIT_LABELS[supply.unit]}</span>}
                    </div>
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
            {totalAmount > 0 && (
              <div className="flex justify-end pt-2 border-t">
                <span className="text-sm font-semibold">Total : {totalAmount.toLocaleString("fr-FR")} XOF</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Création..." : "Créer l'entrée (brouillon)"}
        </Button>
      </form>
    </div>
  );
}
