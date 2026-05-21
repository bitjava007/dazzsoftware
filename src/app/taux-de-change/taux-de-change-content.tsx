"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExchangeRateAction, updateExchangeRateAction, deleteExchangeRateAction } from "@/actions/exchange-rates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";

interface Currency { id: string; code: string; symbol: string; name: string; }
interface ExchangeRate {
  id: string;
  rate: unknown;
  effectiveDate: Date | string;
  source: string | null;
  notes: string | null;
  isActive: boolean;
  fromCurrencyId: string;
  toCurrencyId: string;
  fromCurrency: Currency;
  toCurrency: Currency;
}

function RateForm({
  rate,
  currencies,
  onSubmit,
  onCancel,
  isPending,
}: {
  rate?: ExchangeRate;
  currencies: Currency[];
  onSubmit: (formData: FormData, fromId: string, toId: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [fromId, setFromId] = useState(rate?.fromCurrencyId ?? "");
  const [toId, setToId] = useState(rate?.toCurrencyId ?? "");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData, fromId, toId);
  };

  const effectiveDateValue = rate?.effectiveDate
    ? new Date(rate.effectiveDate).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Devise source *</Label>
          <Select value={fromId} onValueChange={setFromId} disabled={!!rate}>
            <SelectTrigger><SelectValue placeholder="De..." /></SelectTrigger>
            <SelectContent>
              {currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Devise cible *</Label>
          <Select value={toId} onValueChange={setToId} disabled={!!rate}>
            <SelectTrigger><SelectValue placeholder="Vers..." /></SelectTrigger>
            <SelectContent>
              {currencies.filter((c) => c.id !== fromId).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rate">Taux *</Label>
          <Input id="rate" name="rate" type="number" step="0.000001" min="0" required
            defaultValue={rate ? String(Number(rate.rate)) : ""} placeholder="Ex: 655.957" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="effectiveDate">Date effective *</Label>
          <Input id="effectiveDate" name="effectiveDate" type="date" required defaultValue={effectiveDateValue} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="source">Source</Label>
          <Input id="source" name="source" defaultValue={rate?.source ?? ""} placeholder="Ex: Banque centrale" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" name="notes" defaultValue={rate?.notes ?? ""} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={isPending || !fromId || !toId} className="bg-blue-600 hover:bg-blue-700">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (rate ? "Modifier" : "Enregistrer")}
        </Button>
      </div>
    </form>
  );
}

export function TauxDeChangeContent({ rates, currencies }: { rates: ExchangeRate[]; currencies: Currency[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleCreate = (formData: FormData, fromId: string, toId: string) => {
    formData.set("fromCurrencyId", fromId);
    formData.set("toCurrencyId", toId);
    startTransition(async () => {
      const result = await createExchangeRateAction(formData);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Taux créé" });
        setCreateOpen(false);
        router.refresh();
      }
    });
  };

  const handleUpdate = (formData: FormData, fromId: string, toId: string) => {
    if (!editingRate) return;
    formData.set("fromCurrencyId", fromId);
    formData.set("toCurrencyId", toId);
    startTransition(async () => {
      const result = await updateExchangeRateAction(editingRate.id, formData);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Taux modifié" });
        setEditingRate(null);
        router.refresh();
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer ce taux de change ?")) return;
    startTransition(async () => {
      const result = await deleteExchangeRateAction(id);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Taux supprimé" });
        router.refresh();
      }
    });
  };

  const activeRates = rates.filter((r) => r.isActive);

  return (
    <div className="space-y-4">
      {/* Active Rates Summary */}
      {activeRates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeRates.map((r) => (
            <Card key={r.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 mb-1">Taux actif</p>
                <p className="font-bold text-lg">
                  1 {r.fromCurrency.code} = <span className="text-blue-700">{Number(r.rate).toLocaleString("fr-FR", { maximumFractionDigits: 4 })}</span> {r.toCurrency.code}
                </p>
                <p className="text-xs text-gray-400 mt-1">Depuis le {formatDate(r.effectiveDate)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Historique des taux</CardTitle>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-1" />Nouveau taux
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nouveau taux de change</DialogTitle></DialogHeader>
              <RateForm currencies={currencies} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} isPending={isPending} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paire</TableHead>
                <TableHead className="text-right">Taux</TableHead>
                <TableHead>Date effective</TableHead>
                <TableHead className="hidden sm:table-cell">Source</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-gray-400">Aucun taux enregistré</TableCell>
                </TableRow>
              ) : rates.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.fromCurrency.code} → {r.toCurrency.code}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(r.rate).toLocaleString("fr-FR", { maximumFractionDigits: 4 })}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(r.effectiveDate)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-gray-500">{r.source ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={r.isActive ? "default" : "outline"} className="text-xs">
                      {r.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingRate(r)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(r.id)} disabled={isPending}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingRate} onOpenChange={(v) => { if (!v) setEditingRate(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Modifier le taux de change</DialogTitle></DialogHeader>
          {editingRate && (
            <RateForm
              rate={editingRate}
              currencies={currencies}
              onSubmit={handleUpdate}
              onCancel={() => setEditingRate(null)}
              isPending={isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
