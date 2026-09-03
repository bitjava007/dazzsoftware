"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createConsolidatedInvoiceAction, issueInvoiceAction, cancelInvoiceAction } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CurrencyAmount } from "@/components/ui/currency-amount";
import {
  Send, FileText, Download, Loader2, Plus, XCircle, Printer, Eye,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "outline" | "destructive" | "success" | "warning" | "info" }> = {
  draft: { label: "Brouillon", variant: "outline" },
  issued: { label: "Émise", variant: "info" },
  partially_paid: { label: "Part. payée", variant: "warning" },
  paid: { label: "Payée", variant: "success" },
  cancelled: { label: "Annulée", variant: "destructive" },
};

interface Client { id: string; fullName: string; }
interface Currency { id: string; code: string; }
interface EligibleOrder {
  id: string;
  orderNumber: string; // will have this from Prisma
  sellingPrice: unknown;
  client: { id: string; fullName: string };
  currency: { id: string; code: string };
  lines: { lineTotal: unknown }[];
  // Prisma includes these fields from Order
  [key: string]: unknown;
}
interface InvoiceItem {
  id: string;
  orderId: string;
  amount: unknown;
  order: { orderNumber: string; sellingPrice: unknown; currency: { code: string } };
}
interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: Date | string;
  status: string;
  subtotal: unknown;
  discount: unknown;
  bonus: unknown;
  totalAmount: unknown;
  amountPaid: unknown;
  balanceDue: unknown;
  notes: string | null;
  exchangeRateUsed: unknown;
  client: { id: string; fullName: string };
  order: { orderNumber: string; currency: { code: string } } | null;
  items: InvoiceItem[];
  currency: { code: string } | null;
}

export function FacturesContent({
  invoices,
  eligibleOrders,
  clients,
  currencies,
}: {
  invoices: Invoice[];
  eligibleOrders: EligibleOrder[];
  clients: Client[];
  currencies: Currency[];
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // New invoice form state
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  const clientOrders = useMemo(
    () => eligibleOrders.filter((o) => o.client.id === selectedClientId),
    [eligibleOrders, selectedClientId],
  );

  const selectedOrders = useMemo(
    () => clientOrders.filter((o) => selectedOrderIds.includes(o.id)),
    [clientOrders, selectedOrderIds],
  );

  const invoiceTotal = selectedOrders.reduce((s, o) => s + Number(o.sellingPrice), 0);

  const handleClientChange = (id: string) => {
    setSelectedClientId(id);
    setSelectedOrderIds([]);
    const firstOrder = eligibleOrders.find((o) => o.client.id === id);
    if (firstOrder) setSelectedCurrencyId(firstOrder.currency.id);
  };

  const toggleOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const resetCreateForm = () => {
    setSelectedClientId("");
    setSelectedOrderIds([]);
    setSelectedCurrencyId("");
    setInvoiceNotes("");
  };

  const handleCreateInvoice = () => {
    if (!selectedClientId || !selectedOrderIds.length || !selectedCurrencyId) {
      toast({ title: "Erreur", description: "Sélectionnez un client et au moins une commande", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const result = await createConsolidatedInvoiceAction({
        clientId: selectedClientId,
        orderIds: selectedOrderIds,
        currencyId: selectedCurrencyId,
        notes: invoiceNotes || undefined,
      });
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Facture créée", description: `N° ${(result as { invoice: { invoiceNumber: string } }).invoice?.invoiceNumber}` });
        setCreateOpen(false);
        resetCreateForm();
        router.refresh();
      }
    });
  };

  const handleIssue = (id: string) => {
    startTransition(async () => {
      const result = await issueInvoiceAction(id);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Facture émise" });
        router.refresh();
      }
    });
  };

  const handleCancel = (id: string) => {
    if (!confirm("Annuler cette facture ?")) return;
    startTransition(async () => {
      const result = await cancelInvoiceAction(id);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Facture annulée" });
        router.refresh();
      }
    });
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    try {
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = `/api/invoices/${invoice.id}/pdf`;
      a.download = `${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewPdf = (invoiceId: string) => {
    window.open(`/api/invoices/${invoiceId}/pdf`, "_blank");
  };

  const handlePrint = (invoiceId: string) => {
    const win = window.open(`/api/invoices/${invoiceId}/pdf`, "_blank");
    if (win) win.addEventListener("load", () => win.print());
  };

  const filtered = invoices.filter((inv) => {
    const d = new Date(inv.issueDate);
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(endDate + "T23:59:59")) return false;
    return true;
  });

  const totalIssued = filtered.filter((i) => i.status !== "cancelled").reduce((s, i) => s + Number(i.totalAmount), 0);
  const totalPaid = filtered.filter((i) => i.status !== "cancelled").reduce((s, i) => s + Number(i.amountPaid), 0);
  const totalBalance = filtered.filter((i) => i.status !== "cancelled").reduce((s, i) => s + Number(i.balanceDue), 0);

  const currCode = (inv: Invoice) =>
    (inv.currency ?? inv.order?.currency)?.code ?? "";

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total facturé", value: formatCurrency(totalIssued), color: "text-blue-700" },
          { label: "Total encaissé", value: formatCurrency(totalPaid), color: "text-green-600" },
          { label: "Solde restant", value: formatCurrency(totalBalance), color: totalBalance > 0 ? "text-orange-600" : "text-green-600" },
          { label: "Factures", value: String(filtered.length), color: "" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">Liste des factures</CardTitle>
          <div className="flex flex-wrap gap-2 items-center">
            <DateRangeFilter
              startDate={startDate} endDate={endDate}
              onStartDateChange={setStartDate} onEndDateChange={setEndDate}
              onReset={() => { setStartDate(""); setEndDate(""); }}
            />
            <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetCreateForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-1" />Nouvelle facture
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Créer une facture</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 mt-2">
                  {/* Step 1: Client */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">1. Client *</Label>
                    <Select value={selectedClientId} onValueChange={handleClientChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un client..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Step 2: Orders */}
                  {selectedClientId && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">2. Commandes à facturer *</Label>
                      {clientOrders.length === 0 ? (
                        <p className="text-sm text-gray-400 py-3 text-center border rounded-md">
                          Aucune commande non facturée pour ce client
                        </p>
                      ) : (
                        <div className="border rounded-md divide-y max-h-52 overflow-y-auto">
                          {clientOrders.map((order) => {
                            const checked = selectedOrderIds.includes(order.id);
                            return (
                              <label
                                key={order.id}
                                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleOrder(order.id)}
                                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-mono text-sm font-medium">{String(order.orderNumber)}</p>
                                  <p className="text-xs text-gray-500">
                                    {(order.lines as { lineTotal: unknown }[]).length} article(s)
                                  </p>
                                </div>
                                <p className="text-sm font-semibold text-blue-700 shrink-0">
                                  {formatCurrency(Number(order.sellingPrice))} {order.currency.code}
                                </p>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3: Currency + Notes */}
                  {selectedOrderIds.length > 0 && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">3. Devise</Label>
                        <Select value={selectedCurrencyId} onValueChange={setSelectedCurrencyId}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Devise..." />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Notes (optionnel)</Label>
                        <Textarea
                          value={invoiceNotes}
                          onChange={(e) => setInvoiceNotes(e.target.value)}
                          placeholder="Conditions de paiement, remarques..."
                          rows={2}
                        />
                      </div>

                      {/* Summary */}
                      <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                        <p className="text-sm font-semibold text-blue-900">Récapitulatif</p>
                        {selectedOrders.map((o) => (
                          <div key={o.id} className="flex justify-between text-sm">
                            <span className="font-mono text-gray-600">{String(o.orderNumber)}</span>
                            <span>{formatCurrency(Number(o.sellingPrice))} {o.currency.code}</span>
                          </div>
                        ))}
                        <div className="border-t border-blue-200 pt-2 flex justify-between font-bold text-blue-900">
                          <span>Total facturé</span>
                          <span>{formatCurrency(invoiceTotal)}</span>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>
                      Annuler
                    </Button>
                    <Button
                      onClick={handleCreateInvoice}
                      disabled={isPending || !selectedClientId || !selectedOrderIds.length || !selectedCurrencyId}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                      Générer la facture
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden sm:table-cell">Commandes</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right hidden md:table-cell">Payé</TableHead>
                <TableHead className="text-right hidden md:table-cell">Solde</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>Aucune facture</p>
                  </TableCell>
                </TableRow>
              ) : filtered.map((invoice) => {
                const config = STATUS_CONFIG[invoice.status] ?? { label: invoice.status, variant: "outline" as const };
                const isDownloading = downloadingId === invoice.id;
                const orderRefs = invoice.items.length > 0
                  ? invoice.items.map((i) => i.order.orderNumber).join(", ")
                  : (invoice.order?.orderNumber ?? "—");
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">{invoice.invoiceNumber}</TableCell>
                    <TableCell className="text-sm font-medium">{invoice.client.fullName}</TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs text-gray-500">
                      {orderRefs}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(invoice.issueDate)}</TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      <CurrencyAmount
                        amount={Number(invoice.totalAmount)}
                        currencyCode={currCode(invoice) || "XOF"}
                        exchangeRateUsed={invoice.exchangeRateUsed ? Number(invoice.exchangeRateUsed) : null}
                      />
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell text-green-600 text-sm">
                      {formatCurrency(Number(invoice.amountPaid))}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell text-sm">
                      <span className={Number(invoice.balanceDue) > 0 ? "text-orange-600 font-medium" : "text-green-600"}>
                        {formatCurrency(Number(invoice.balanceDue))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {invoice.status === "draft" && (
                          <Button variant="outline" size="sm" onClick={() => handleIssue(invoice.id)} disabled={isPending} title="Émettre">
                            <Send className="w-3 h-3" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleViewPdf(invoice.id)} title="Voir PDF">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(invoice)} disabled={isDownloading} title="Télécharger PDF">
                          {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handlePrint(invoice.id)} title="Imprimer">
                          <Printer className="w-3 h-3" />
                        </Button>
                        {invoice.status !== "cancelled" && invoice.status !== "paid" && (
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleCancel(invoice.id)} disabled={isPending} title="Annuler">
                            <XCircle className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
