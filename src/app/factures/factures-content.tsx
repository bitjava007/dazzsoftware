"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueInvoiceAction } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Send, FileText } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: any }> = {
  draft: { label: "Brouillon", variant: "outline" },
  issued: { label: "Émise", variant: "info" },
  partially_paid: { label: "Partiellement payée", variant: "warning" },
  paid: { label: "Payée", variant: "success" },
  cancelled: { label: "Annulée", variant: "destructive" },
};

export function FacturesContent({ invoices }: { invoices: any[] }) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

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

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Facture</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Commande</TableHead>
              <TableHead>Date émission</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Payé</TableHead>
              <TableHead className="text-right">Solde</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>Aucune facture</p>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => {
                const config = STATUS_CONFIG[invoice.status] ?? { label: invoice.status, variant: "outline" };
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.order.client.fullName}</TableCell>
                    <TableCell className="font-mono text-xs">{invoice.order.orderNumber}</TableCell>
                    <TableCell className="text-sm">{formatDate(invoice.issueDate)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(invoice.totalAmount))}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(Number(invoice.amountPaid))}</TableCell>
                    <TableCell className="text-right">
                      <span className={Number(invoice.balanceDue) > 0 ? "text-orange-600 font-medium" : "text-green-600"}>
                        {formatCurrency(Number(invoice.balanceDue))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.status === "draft" && (
                        <Button variant="outline" size="sm" onClick={() => handleIssue(invoice.id)} disabled={isPending}>
                          <Send className="w-3 h-3 mr-1" />
                          Émettre
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
