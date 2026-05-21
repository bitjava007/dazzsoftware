"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatusAction } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";

const ORDER_STATUSES = [
  { value: "brouillon", label: "Brouillon" },
  { value: "confirmee", label: "Confirmée" },
  { value: "mesures_prises", label: "Mesures prises" },
  { value: "tissu_achete", label: "Tissu acheté" },
  { value: "coupe", label: "Coupe" },
  { value: "couture", label: "Couture" },
  { value: "essayage", label: "Essayage" },
  { value: "retouches", label: "Retouches" },
  { value: "finition", label: "Finition" },
  { value: "pret_livraison", label: "Prêt livraison" },
  { value: "livree", label: "Livrée" },
  { value: "annulee", label: "Annulée" },
];

export function OrderStatusChanger({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = () => {
    if (!newStatus) return;
    startTransition(async () => {
      const result = await updateOrderStatusAction(orderId, newStatus as any, note);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Statut mis à jour" });
        setOpen(false);
        setNewStatus("");
        setNote("");
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-1" />
          Changer statut
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer le statut de la commande</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>Nouveau statut</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un statut..." />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.filter((s) => s.value !== currentStatus).map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="note">Note (optionnel)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Commentaire sur ce changement..."
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={isPending || !newStatus} className="bg-blue-600 hover:bg-blue-700">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
