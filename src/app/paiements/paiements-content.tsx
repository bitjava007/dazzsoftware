"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPaymentAction, updatePaymentAction, deletePaymentAction } from "@/actions/payments";
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
import { CurrencyAmount } from "@/components/ui/currency-amount";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Edit2, Trash2, Loader2, Search, MoreHorizontal, Eye, Download, Printer, Share2 } from "lucide-react";

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
  { value: "wave", label: "Wave" },
  { value: "orange_money", label: "Orange Money" },
  { value: "bank_transfer", label: "Virement bancaire" },
  { value: "card", label: "Carte bancaire" },
];

interface Payment {
  id: string;
  receiptNumber: string;
  paymentDate: Date | string;
  paymentType: string;
  paymentMethod: string;
  amountOriginal: unknown;
  exchangeRateUsed: unknown;
  amountXof: unknown;
  paymentReference: string | null;
  label: string | null;
  orderId: string;
  currencyId: string;
  order: { orderNumber: string; client: { fullName: string } };
  currency: { code: string };
}

function PaymentForm({
  payment,
  orders,
  currencies,
  onSubmit,
  onCancel,
  isPending,
}: {
  payment?: Payment;
  orders: any[];
  currencies: any[];
  onSubmit: (formData: FormData, orderId: string, paymentType: string, paymentMethod: string, currencyId: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [orderId, setOrderId] = useState(payment?.orderId ?? "");
  const [paymentType, setPaymentType] = useState(payment?.paymentType ?? "");
  const [paymentMethod, setPaymentMethod] = useState(payment?.paymentMethod ?? "");
  const [currencyId, setCurrencyId] = useState(payment?.currencyId ?? "");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData, orderId, paymentType, paymentMethod, currencyId);
  };

  const paymentDateValue = payment?.paymentDate
    ? new Date(payment.paymentDate).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <Label>Commande *</Label>
          <Select value={orderId} onValueChange={setOrderId}>
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
          <Input id="amountOriginal" name="amountOriginal" type="number" step="0.01" min="0" required
            defaultValue={payment ? String(Number(payment.amountOriginal)) : ""} />
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
          <Input id="paymentDate" name="paymentDate" type="date" required defaultValue={paymentDateValue} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="paymentReference">Référence</Label>
          <Input id="paymentReference" name="paymentReference" defaultValue={payment?.paymentReference ?? ""} placeholder="N° de transaction" />
        </div>

        <div className="col-span-2 space-y-1">
          <Label htmlFor="label">Libellé</Label>
          <Input id="label" name="label" defaultValue={payment?.label ?? ""} placeholder="Description du paiement" />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={isPending || !orderId || !paymentType || !paymentMethod || !currencyId} className="bg-blue-600 hover:bg-blue-700">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (payment ? "Modifier" : "Enregistrer")}
        </Button>
      </div>
    </form>
  );
}

export function PaiementsContent({ payments, orders, currencies }: {
  payments: Payment[];
  orders: any[];
  currencies: any[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  const handleCreate = (formData: FormData, orderId: string, paymentType: string, paymentMethod: string, currencyId: string) => {
    formData.set("orderId", orderId);
    formData.set("paymentType", paymentType);
    formData.set("paymentMethod", paymentMethod);
    formData.set("currencyId", currencyId);
    startTransition(async () => {
      const result = await createPaymentAction(formData);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Paiement enregistré" });
        setCreateOpen(false);
        router.refresh();
      }
    });
  };

  const handleUpdate = (formData: FormData, orderId: string, paymentType: string, paymentMethod: string, currencyId: string) => {
    if (!editingPayment) return;
    formData.set("orderId", orderId);
    formData.set("paymentType", paymentType);
    formData.set("paymentMethod", paymentMethod);
    formData.set("currencyId", currencyId);
    startTransition(async () => {
      const result = await updatePaymentAction(editingPayment.id, formData);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Paiement modifié" });
        setEditingPayment(null);
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

  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  const handleView = (id: string) => {
    window.open(`/api/payments/${id}/receipt`, "_blank");
  };

  const handleDownload = (id: string, receiptNumber: string) => {
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = `/api/payments/${id}/receipt`;
    a.download = `${receiptNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = (id: string) => {
    const win = window.open(`/api/payments/${id}/receipt`, "_blank");
    if (win) {
      win.addEventListener("load", () => win.print());
    }
  };

  const handleShare = async (id: string, receiptNumber: string) => {
    try {
      setPdfLoading(id);
      const res = await fetch(`/api/payments/${id}/receipt`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const file = new File([blob], `${receiptNumber}.pdf`, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Reçu ${receiptNumber}` });
      } else {
        handleDownload(id, receiptNumber);
      }
    } catch {
      handleDownload(id, receiptNumber);
    } finally {
      setPdfLoading(null);
    }
  };

  const filtered = payments.filter((p) => {
    const text = search.toLowerCase();
    const matchText = !text ||
      p.receiptNumber.toLowerCase().includes(text) ||
      p.order.client.fullName.toLowerCase().includes(text) ||
      p.order.orderNumber.toLowerCase().includes(text);
    const matchMethod = methodFilter === "all" || p.paymentMethod === methodFilter;
    const d = new Date(p.paymentDate);
    const matchStart = !startDate || d >= new Date(startDate);
    const matchEnd = !endDate || d <= new Date(endDate + "T23:59:59");
    return matchText && matchMethod && matchStart && matchEnd;
  });

  const totalPaid = filtered
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
            <p className="text-2xl font-bold mt-1">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Paiements finaux</p>
            <p className="text-2xl font-bold mt-1">{filtered.filter((p) => p.paymentType === "paiement_final").length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Historique des paiements</CardTitle>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-1" />Nouveau paiement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Enregistrer un paiement</DialogTitle>
              </DialogHeader>
              <PaymentForm orders={orders} currencies={currencies} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} isPending={isPending} />
            </DialogContent>
          </Dialog>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-8 text-sm" />
            </div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="h-8 text-sm w-full sm:w-44">
                <SelectValue placeholder="Toutes méthodes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes méthodes</SelectItem>
                {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <DateRangeFilter
              startDate={startDate} endDate={endDate}
              onStartDateChange={setStartDate} onEndDateChange={setEndDate}
              onReset={() => { setStartDate(""); setEndDate(""); setMethodFilter("all"); setSearch(""); }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Reçu</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden sm:table-cell">Commande</TableHead>
                <TableHead className="hidden md:table-cell">Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden lg:table-cell">Méthode</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-gray-400">Aucun paiement trouvé</TableCell>
                </TableRow>
              ) : filtered.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-xs">{payment.receiptNumber}</TableCell>
                  <TableCell className="text-sm">{formatDate(payment.paymentDate)}</TableCell>
                  <TableCell className="hidden sm:table-cell font-mono text-xs">{payment.order.orderNumber}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{payment.order.client.fullName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {PAYMENT_TYPES.find((t) => t.value === payment.paymentType)?.label ?? payment.paymentType}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-gray-500">
                    {PAYMENT_METHODS.find((m) => m.value === payment.paymentMethod)?.label ?? payment.paymentMethod}
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-600">
                    <CurrencyAmount
                      amount={Number(payment.amountOriginal)}
                      currencyCode={payment.currency.code}
                      exchangeRateUsed={payment.exchangeRateUsed ? Number(payment.exchangeRateUsed) : null}
                      amountXof={payment.amountXof ? Number(payment.amountXof) : null}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingPayment(payment)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={pdfLoading === payment.id}>
                            {pdfLoading === payment.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <MoreHorizontal className="w-4 h-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(payment.id)}>
                            <Eye className="w-4 h-4 mr-2" />Voir reçu
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(payment.id, payment.receiptNumber)}>
                            <Download className="w-4 h-4 mr-2" />Télécharger PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrint(payment.id)}>
                            <Printer className="w-4 h-4 mr-2" />Imprimer
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleShare(payment.id, payment.receiptNumber)}>
                            <Share2 className="w-4 h-4 mr-2" />Partager
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(payment.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Payment Dialog */}
      <Dialog open={!!editingPayment} onOpenChange={(v) => { if (!v) setEditingPayment(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le paiement</DialogTitle>
          </DialogHeader>
          {editingPayment && (
            <PaymentForm
              payment={editingPayment}
              orders={orders}
              currencies={currencies}
              onSubmit={handleUpdate}
              onCancel={() => setEditingPayment(null)}
              isPending={isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
