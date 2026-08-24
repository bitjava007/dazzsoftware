"use client";

import { useState, useTransition } from "react";
import { createStockTransfer } from "@/actions/stock-transferts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";

const UNIT_LABELS: Record<string, string> = {
  piece: "pcs", metre: "m", centimetre: "cm", bobine: "bob.", rouleau: "rou.",
  kilogramme: "kg", gramme: "g", litre: "L", paquet: "pqt", boite: "bte", autre: "—",
};

type Supply = { id: string; name: string; unit: string };
type Location = { id: string; name: string };
type Balance = { supplyId: string; locationId: string; quantity: unknown };
interface Line { supplyId: string; quantity: string }

export function TransfertForm({ supplies, locations, balances }: { supplies: Supply[]; locations: Location[]; balances: Balance[] }) {
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [lines, setLines] = useState<Line[]>([{ supplyId: "", quantity: "" }]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const getAvailable = (supplyId: string) => {
    if (!fromLocationId) return null;
    const b = balances.find((b) => b.supplyId === supplyId && b.locationId === fromLocationId);
    return b ? Number(b.quantity) : 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!fromLocationId || !toLocationId) { setError("Source et destination requises"); return; }
    if (fromLocationId === toLocationId) { setError("Source et destination doivent être différentes"); return; }
    const fd = new FormData(e.currentTarget);
    fd.set("fromLocationId", fromLocationId);
    fd.set("toLocationId", toLocationId);
    const parsedLines = lines.map((l) => ({ supplyId: l.supplyId, quantity: parseFloat(l.quantity) }));
    if (parsedLines.some((l) => !l.supplyId || isNaN(l.quantity) || l.quantity <= 0)) {
      setError("Toutes les lignes doivent être complètes");
      return;
    }
    fd.set("lines", JSON.stringify(parsedLines));
    startTransition(async () => {
      try {
        await createStockTransfer(fd);
      } catch (err: unknown) {
        if (err instanceof Error && !err.message.includes("NEXT_REDIRECT")) setError(err.message);
      }
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/fournitures/transferts"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau transfert</h1>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Trajet</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="space-y-1.5">
              <Label>Source *</Label>
              <Select value={fromLocationId} onValueChange={setFromLocationId} required>
                <SelectTrigger><SelectValue placeholder="Emplacement source" /></SelectTrigger>
                <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex justify-center"><ArrowRight className="w-6 h-6 text-gray-400" /></div>
            <div className="space-y-1.5">
              <Label>Destination *</Label>
              <Select value={toLocationId} onValueChange={setToLocationId} required>
                <SelectTrigger><SelectValue placeholder="Emplacement destination" /></SelectTrigger>
                <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
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
              <CardTitle className="text-base">Fournitures à transférer</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setLines((l) => [...l, { supplyId: "", quantity: "" }])}>
                <Plus className="w-3.5 h-3.5 mr-1" />Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {lines.map((line, i) => {
              const supply = supplies.find((s) => s.id === line.supplyId);
              const available = line.supplyId ? getAvailable(line.supplyId) : null;
              return (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-7">
                    <Select value={line.supplyId} onValueChange={(v) => setLines((l) => l.map((x, idx) => idx === i ? { ...x, supplyId: v } : x))}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Fourniture" /></SelectTrigger>
                      <SelectContent>{supplies.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                    {available !== null && <p className="text-xs text-gray-400 mt-0.5">Disponible : {available.toLocaleString("fr-FR")} {supply ? UNIT_LABELS[supply.unit] : ""}</p>}
                  </div>
                  <div className="col-span-4">
                    <Input className="h-9" type="number" min="0.001" step="0.001" placeholder="Quantité"
                      value={line.quantity} onChange={(e) => setLines((l) => l.map((x, idx) => idx === i ? { ...x, quantity: e.target.value } : x))} />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {lines.length > 1 && (
                      <button type="button" onClick={() => setLines((l) => l.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 p-1">
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
          {isPending ? "Création..." : "Créer le transfert (brouillon)"}
        </Button>
      </form>
    </div>
  );
}
