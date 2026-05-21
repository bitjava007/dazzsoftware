"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMeasurementAction, updateMeasurementAction, deleteMeasurementAction } from "@/actions/measurements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";

const MEASUREMENT_FIELDS = [
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
] as const;

interface Client { id: string; fullName: string; }
interface Measurement {
  id: string;
  clientId: string;
  profileName: string | null;
  chest: unknown;
  waist: unknown;
  hips: unknown;
  shoulders: unknown;
  armLength: unknown;
  neck: unknown;
  shirtLength: unknown;
  trouserLength: unknown;
  dressLength: unknown;
  wrist: unknown;
  thigh: unknown;
  knee: unknown;
  ankle: unknown;
  inseam: unknown;
  notes: string | null;
  createdAt: Date;
  client: { id: string; fullName: string; };
}

function MeasurementForm({
  measurement,
  clients,
  clientId: defaultClientId,
  onSubmit,
  onCancel,
  isPending,
}: {
  measurement?: Measurement;
  clients: Client[];
  clientId?: string;
  onSubmit: (formData: FormData, clientId: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [clientId, setClientId] = useState(measurement?.clientId ?? defaultClientId ?? "");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData, clientId);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      {!measurement && (
        <div className="space-y-1">
          <Label>Client *</Label>
          <Select value={clientId} onValueChange={setClientId} required>
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
      )}
      <div className="space-y-1">
        <Label htmlFor="profileName">Nom du profil</Label>
        <Input
          id="profileName"
          name="profileName"
          defaultValue={measurement?.profileName ?? ""}
          placeholder="Ex: Tenue de mariage"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {MEASUREMENT_FIELDS.map((field) => (
          <div key={field.name} className="space-y-1">
            <Label htmlFor={field.name} className="text-xs">{field.label}</Label>
            <Input
              id={field.name}
              name={field.name}
              type="number"
              step="0.5"
              min="0"
              defaultValue={measurement ? String(measurement[field.name] ?? "") : ""}
              className="h-8 text-sm"
              placeholder="0"
            />
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={measurement?.notes ?? ""} />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button
          type="submit"
          disabled={isPending || (!measurement && !clientId)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (measurement ? "Sauvegarder" : "Enregistrer")}
        </Button>
      </div>
    </form>
  );
}

export function MesuresContent({ measurements, clients }: { measurements: Measurement[]; clients: Client[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleCreate = (formData: FormData, clientId: string) => {
    formData.set("clientId", clientId);
    startTransition(async () => {
      const result = await createMeasurementAction(formData);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Mesures enregistrées" });
        setCreateOpen(false);
        router.refresh();
      }
    });
  };

  const handleUpdate = (formData: FormData, clientId: string) => {
    if (!editingMeasurement) return;
    formData.set("clientId", clientId);
    startTransition(async () => {
      const result = await updateMeasurementAction(editingMeasurement.id, formData);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Mesures modifiées" });
        setEditingMeasurement(null);
        router.refresh();
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer ces mesures ?")) return;
    startTransition(async () => {
      const result = await deleteMeasurementAction(id);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Mesures supprimées" });
        router.refresh();
      }
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Fiches de mesures</CardTitle>
        <Dialog open={createOpen} onOpenChange={(v) => setCreateOpen(v)}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1" />
              Nouvelles mesures
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelles mesures</DialogTitle>
            </DialogHeader>
            <MeasurementForm
              clients={clients}
              onSubmit={handleCreate}
              onCancel={() => setCreateOpen(false)}
              isPending={isPending}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Profil</TableHead>
              <TableHead>Poitrine</TableHead>
              <TableHead>Taille</TableHead>
              <TableHead>Hanches</TableHead>
              <TableHead>Long. robe</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {measurements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-gray-400">Aucune mesure</TableCell>
              </TableRow>
            ) : (
              measurements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.client.fullName}</TableCell>
                  <TableCell className="text-gray-500">{m.profileName ?? "—"}</TableCell>
                  <TableCell>{m.chest ? `${m.chest} cm` : "—"}</TableCell>
                  <TableCell>{m.waist ? `${m.waist} cm` : "—"}</TableCell>
                  <TableCell>{m.hips ? `${m.hips} cm` : "—"}</TableCell>
                  <TableCell>{m.dressLength ? `${m.dressLength} cm` : "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(m.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingMeasurement(m)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(m.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingMeasurement} onOpenChange={(v) => { if (!v) setEditingMeasurement(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier les mesures — {editingMeasurement?.client.fullName}</DialogTitle>
          </DialogHeader>
          {editingMeasurement && (
            <MeasurementForm
              measurement={editingMeasurement}
              clients={clients}
              clientId={editingMeasurement.clientId}
              onSubmit={handleUpdate}
              onCancel={() => setEditingMeasurement(null)}
              isPending={isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
