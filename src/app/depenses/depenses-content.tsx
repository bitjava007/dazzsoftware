"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExpenseAction, deleteExpenseAction } from "@/actions/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { Plus, Trash2, Loader2 } from "lucide-react";

const PAYMENT_TYPES = [
  { value: "cash", label: "Espèces" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "bank_transfer", label: "Virement bancaire" },
  { value: "card", label: "Carte bancaire" },
];

export function DepensesContent({ expenses, categories, orders, currencies }: {
  expenses: any[];
  categories: any[];
  orders: any[];
  currencies: any[];
}) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [linkedToOrder, setLinkedToOrder] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (categoryId) formData.set("categoryId", categoryId);
    if (subcategoryId) formData.set("subcategoryId", subcategoryId);
    if (orderId && linkedToOrder) formData.set("orderId", orderId);
    if (currencyId) formData.set("currencyId", currencyId);
    if (paymentType) formData.set("paymentType", paymentType);
    formData.set("linkedToOrder", linkedToOrder ? "true" : "false");

    startTransition(async () => {
      const result = await createExpenseAction(formData);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Dépense enregistrée" });
        setOpen(false);
        resetForm();
        router.refresh();
      }
    });
  };

  const resetForm = () => {
    setCategoryId("");
    setSubcategoryId("");
    setOrderId("");
    setCurrencyId("");
    setPaymentType("");
    setLinkedToOrder(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer cette dépense ?")) return;
    startTransition(async () => {
      const result = await deleteExpenseAction(id);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Dépense supprimée" });
        router.refresh();
      }
    });
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchCat = categoryFilter === "all" || e.category?.id === categoryFilter;
    const d = new Date(e.expenseDate);
    const matchStart = !startDate || d >= new Date(startDate);
    const matchEnd = !endDate || d <= new Date(endDate + "T23:59:59");
    return matchCat && matchStart && matchEnd;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amountOriginal), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Total dépenses</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Nombre de dépenses</p>
            <p className="text-2xl font-bold mt-1">{filteredExpenses.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Liées aux commandes</p>
            <p className="text-2xl font-bold mt-1">{filteredExpenses.filter((e) => e.linkedToOrder).length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Liste des dépenses</CardTitle>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-1" />
                Nouvelle dépense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nouvelle dépense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Catégorie</Label>
                    <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubcategoryId(""); }}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCategory?.subcategories?.length > 0 && (
                    <div className="space-y-1">
                      <Label>Sous-catégorie</Label>
                      <Select value={subcategoryId} onValueChange={setSubcategoryId}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          {selectedCategory.subcategories.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="expenseDate">Date *</Label>
                    <Input id="expenseDate" name="expenseDate" type="date" required defaultValue={new Date().toISOString().split("T")[0]} />
                  </div>

                  <div className="space-y-1">
                    <Label>Type de paiement *</Label>
                    <Select value={paymentType} onValueChange={setPaymentType} required>
                      <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="amountOriginal">Montant *</Label>
                    <Input id="amountOriginal" name="amountOriginal" type="number" step="0.01" min="0" required />
                  </div>

                  <div className="space-y-1">
                    <Label>Devise *</Label>
                    <Select value={currencyId} onValueChange={setCurrencyId} required>
                      <SelectTrigger><SelectValue placeholder="Devise..." /></SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} ({c.symbol})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="beneficiary">Bénéficiaire</Label>
                    <Input id="beneficiary" name="beneficiary" placeholder="Nom du bénéficiaire" />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label htmlFor="label">Libellé</Label>
                    <Input id="label" name="label" placeholder="Description courte" />
                  </div>

                  <div className="col-span-2 flex items-center gap-2">
                    <input type="checkbox" id="linkedToOrder" checked={linkedToOrder} onChange={(e) => setLinkedToOrder(e.target.checked)} className="rounded" />
                    <Label htmlFor="linkedToOrder">Lier à une commande</Label>
                  </div>

                  {linkedToOrder && (
                    <div className="col-span-2 space-y-1">
                      <Label>Commande</Label>
                      <Select value={orderId} onValueChange={setOrderId}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner une commande..." /></SelectTrigger>
                        <SelectContent>
                          {orders.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.orderNumber} - {o.client.fullName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                  <Button type="submit" disabled={isPending || !paymentType || !currencyId} className="bg-blue-600 hover:bg-blue-700">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enregistrer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 text-sm w-full sm:w-48">
                <SelectValue placeholder="Toutes catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <DateRangeFilter
              startDate={startDate} endDate={endDate}
              onStartDateChange={setStartDate} onEndDateChange={setEndDate}
              onReset={() => { setStartDate(""); setEndDate(""); setCategoryFilter("all"); }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Dépense</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Bénéficiaire</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Commande</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-gray-400">Aucune dépense trouvée</TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-mono text-sm">{expense.expenseNumber}</TableCell>
                    <TableCell className="text-sm">{formatDate(expense.expenseDate)}</TableCell>
                    <TableCell className="text-sm">{expense.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{expense.beneficiary ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {PAYMENT_TYPES.find((t) => t.value === expense.paymentType)?.label ?? expense.paymentType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(expense.amountOriginal))} {expense.currency.code}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {expense.order ? expense.order.orderNumber : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(expense.id)} disabled={isPending}>
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
