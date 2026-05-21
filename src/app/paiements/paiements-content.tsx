"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPaymentAction, deletePaymentAction } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Trash2, Loader2 } from "lucide-react";

const PAYMENT_TYPES = [
  { value: "acompte_initial", label: "Acompte initial" },
  { value: "acompte", label: "Acompte" },
  { value: "paiement_final", label: "Paiement final" },
  { value: "remboursement", label: "Remboursement" },
  { value: "bonus", label: "Bonus" },
  { value: "remise", label: "Remise" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Espèces" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "bank_transfer", label: "Virement bancaire" },
  { value: "card", label: "Carte bancaire" },
];

export function PaiementsContent({ payments, orders, currencies }: {
  payments: any[];
  orders: any[];
  currencies: any[];
}) {
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const resetForm = () => {
    setOrderId("");
    setPaymentType("");
    setPaymentMethod("");
    setCurrencyId("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (orderId) formData.set("orderId", orderId);
    if (paymentType) formData.set("paymentType", paymentType);
    if (paymentMethod) formData.set("paymentMethod", paymentMethod);
    if (currencyId) formData.set("currencyId", currencyId);

    startTransition(async () => {
      const result = await createPaymentAction(formData);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Paiement enregistré" });
        setOpen(false);
        resetForm();
        router.refresh();
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer ce paiement ?")) return;
    startTransition(async () => {
      const result = await deletePaymentAction(id);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Paiement supprimé" });
        router.refresh();
      }
    });
  };

  const totalPaid = payments
    .filter((p) => !["remboursement", "remise"].includes(p.paymentType))
    .reduce((sum, p) => sum + Number(p.amountOriginal), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Total encaissé</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Nombre de paiements</p>
            <p className="text-2xl font-bold mt-1">{payments.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Paiements finaux</p>
            <p className="text-2xl font-bold mt-1">{payments.filter((p) => p.paymentType === "paiement_final").length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Historique des paiements</CardTitle>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-1" />
                Nouveau paiement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Enregistrer un paiement</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <Label>Commande *</Label>
                    <Select value={orderId} onValueChange={setOrderId} required>
                      <SelectTrigger><SelectValue placeholder="Sélectionner une commande..." /></SelectTrigger>
                      <SelectContent>
                        {orders.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.orderNumber} — {o.client.fullName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Type de paiement *</Label>
                    <Select value={paymentType} onValueChange={setPaymentType}>
                      <SelectTrigger><SelectValue placeholder="Type..." /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Méthode *</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger><SelectValue placeholder="Méthode..." /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="amountOriginal">Montant *</Label>
                    <Input id="amountOriginal" name="amountOriginal" type="number" step="0.01" min="0" required />
                  </div>

                  <div className="space-y-1">
                    <Label>Devise *</Label>
                    <Select value={currencyId} onValueChange={setCurrencyId}>
                      <SelectTrigger><SelectValue placeholder="Devise..." /></SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="paymentDate">Date *</Label>
                    <Input id="paymentDate" name="paymentDate" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="paymentReference">Référence</Label>
                    <Input id="paymentReference" name="paymentReference" placeholder="N° de transaction" />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="label">Libellé</Label>
                    <Input id="label" name="label" placeholder="Description du paiement" />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" disabled={isPending || !orderId || !paymentType || !paymentMethod || !currencyId} className="bg-blue-600 hover:bg-blue-700">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Reçu</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Commande</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Méthode</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-gray-400">Aucun paiement</TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">{payment.receiptNumber}</TableCell>
                    <TableCell className="text-sm">{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell className="font-mono text-xs">{payment.order.orderNumber}</TableCell>
                    <TableCell className="text-sm">{payment.order.client.fullName}</TableCell>
                    <TableCell>
                      <Badge variant="info" className="text-xs">
                        {PAYMENT_TYPES.find((t) => t.value === payment.paymentType)?.label ?? payment.paymentType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {PAYMENT_METHODS.find((m) => m.value === payment.paymentMethod)?.label ?? payment.paymentMethod}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(Number(payment.amountOriginal))} {payment.currency.code}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(payment.id)} disabled={isPending}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
