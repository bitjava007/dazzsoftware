"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMeasurementAction, deleteMeasurementAction } from "@/actions/measurements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Trash2, Loader2 } from "lucide-react";

interface MeasurementData {
  id: string;
  clientId: string;
  profileName: string | null;
  chest: string | null;
  waist: string | null;
  hips: string | null;
  shoulders: string | null;
  armLength: string | null;
  neck: string | null;
  shirtLength: string | null;
  trouserLength: string | null;
  dressLength: string | null;
  wrist: string | null;
  thigh: string | null;
  knee: string | null;
  ankle: string | null;
  inseam: string | null;
  notes: string | null;
}

const FIELDS: { name: keyof MeasurementData; label: string }[] = [
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

export function MeasurementActions({ measurement }: { measurement: MeasurementData }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("clientId", measurement.clientId);

    startTransition(async () => {
      const result = await updateMeasurementAction(measurement.id, formData);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Mesures modifiées" });
        setOpen(false);
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Supprimer ces mesures ?")) return;
    startTransition(async () => {
      const result = await deleteMeasurementAction(measurement.id);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Mesures supprimées" });
        router.refresh();
      }
    });
  };

  return (
    <div className="flex gap-1 shrink-0">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier les mesures</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="profileName">Nom du profil</Label>
              <Input
                id="profileName"
                name="profileName"
                defaultValue={measurement.profileName ?? ""}
                placeholder="Ex: Tenue de mariée"
              />
            </div>
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
                    defaultValue={measurement[name] ?? ""}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={measurement.notes ?? ""}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sauvegarder"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Button
        variant="ghost"
        size="sm"
        className="text-red-500 hover:text-red-700"
        onClick={handleDelete}
        disabled={isPending}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
