"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueInvoiceAction } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Send, FileText, Download, Loader2 } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "outline" | "destructive" | "success" | "warning" | "info" }> = {
  draft: { label: "Brouillon", variant: "outline" },
  issued: { label: "Émise", variant: "info" },
  partially_paid: { label: "Part. payée", variant: "warning" },
  paid: { label: "Payée", variant: "success" },
  cancelled: { label: "Annulée", variant: "destructive" },
};

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: Date | string;
  status: string;
  totalAmount: unknown;
  amountPaid: unknown;
  balanceDue: unknown;
  order: { orderNumber: string; client: { id: string; fullName: string }; currency: { code: string } };
  currency: { code: string } | null;
}

export function FacturesContent({ invoices }: { invoices: Invoice[] }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filtered = invoices.filter((inv) => {
    const d = new Date(inv.issueDate);
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(endDate + "T23:59:59")) return false;
    return true;
  });

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

  const handleDownloadPdf = async (invoice: Invoice) => {
    setDownloadingId(invoice.id);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/pdf`);
      if (!res.ok) {
        toast({ title: "Erreur", description: "Impossible de générer le PDF", variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erreur", description: "Erreur lors du téléchargement", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const totalIssued = filtered.filter((i) => i.status !== "cancelled").reduce((s, i) => s + Number(i.totalAmount), 0);
  const totalPaid = filtered.filter((i) => i.status !== "cancelled").reduce((s, i) => s + Number(i.amountPaid), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total facturé", value: formatCurrency(totalIssued), color: "text-blue-700" },
          { label: "Total encaissé", value: formatCurrency(totalPaid), color: "text-green-600" },
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
          <DateRangeFilter
            startDate={startDate} endDate={endDate}
            onStartDateChange={setStartDate} onEndDateChange={setEndDate}
            onReset={() => { setStartDate(""); setEndDate(""); }}
          />
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden sm:table-cell">Commande</TableHead>
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
                const currCode = (invoice.currency ?? invoice.order.currency)?.code ?? "";
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">{invoice.invoiceNumber}</TableCell>
                    <TableCell className="text-sm">{invoice.order.client.fullName}</TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-xs">{invoice.order.orderNumber}</TableCell>
                    <TableCell className="text-sm">{formatDate(invoice.issueDate)}</TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {formatCurrency(Number(invoice.totalAmount))} {currCode}
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
                          <Button variant="outline" size="sm" onClick={() => handleIssue(invoice.id)} disabled={isPending}>
                            <Send className="w-3 h-3 sm:mr-1" />
                            <span className="hidden sm:inline">Émettre</span>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(invoice)} disabled={isDownloading} title="Télécharger PDF">
                          {isDownloading
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Download className="w-3 h-3 sm:mr-1" />
                          }
                          <span className="hidden sm:inline">PDF</span>
                        </Button>
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
