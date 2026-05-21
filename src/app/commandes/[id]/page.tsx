import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderById } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { ArrowLeft, User, Package, Calendar, CreditCard, Receipt } from "lucide-react";
import { OrderStatusChanger } from "./order-status-changer";
import { createInvoiceAction } from "@/actions/invoices";

const STATUS_CONFIG: Record<string, { label: string; variant: any; color: string }> = {
  brouillon: { label: "Brouillon", variant: "outline", color: "bg-gray-100 text-gray-700" },
  confirmee: { label: "Confirmée", variant: "info", color: "bg-blue-100 text-blue-700" },
  mesures_prises: { label: "Mesures prises", variant: "info", color: "bg-blue-100 text-blue-700" },
  tissu_achete: { label: "Tissu acheté", variant: "info", color: "bg-cyan-100 text-cyan-700" },
  coupe: { label: "Coupe", variant: "warning", color: "bg-yellow-100 text-yellow-700" },
  couture: { label: "Couture", variant: "warning", color: "bg-orange-100 text-orange-700" },
  essayage: { label: "Essayage", variant: "warning", color: "bg-amber-100 text-amber-700" },
  retouches: { label: "Retouches", variant: "warning", color: "bg-yellow-100 text-yellow-700" },
  finition: { label: "Finition", variant: "warning", color: "bg-orange-100 text-orange-700" },
  pret_livraison: { label: "Prêt livraison", variant: "success", color: "bg-emerald-100 text-emerald-700" },
  livree: { label: "Livrée", variant: "success", color: "bg-green-100 text-green-700" },
  annulee: { label: "Annulée", variant: "destructive", color: "bg-red-100 text-red-700" },
};

export default async function CommandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) notFound();

  const totalPaid = order.payments.reduce((sum, p) => sum + Number(p.amountOriginal), 0);
  const totalCost = order.expenses.reduce((sum, e) => sum + Number(e.amountOriginal), 0);
  const balanceDue = Number(order.sellingPrice) - totalPaid;
  const grossMargin = Number(order.sellingPrice) - totalCost;
  const config = STATUS_CONFIG[order.currentStatus] ?? { label: order.currentStatus, variant: "outline", color: "" };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/commandes"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Commande {order.orderNumber}</h1>
            <p className="text-sm text-gray-500">Créée le {formatDate(order.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${config.color}`}>
            {config.label}
          </span>
          <OrderStatusChanger orderId={id} currentStatus={order.currentStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client & Article */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Client</p>
                  <p className="font-semibold">{order.client.fullName}</p>
                  {order.client.phone && <p className="text-sm text-gray-500">{order.client.phone}</p>}
                </div>
              </div>
              <Separator />
              {order.article && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Package className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Article</p>
                    <p className="font-semibold">{order.article.name}</p>
                  </div>
                </div>
              )}
              {order.orderDetails && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Détails de la commande</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.orderDetails}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Date de commande</p>
                  <p className="font-medium">{formatDate(order.orderDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Livraison prévue</p>
                  <p className="font-medium">{formatDate(order.expectedDeliveryDate)}</p>
                </div>
                {order.actualDeliveryDate && (
                  <div>
                    <p className="text-xs text-gray-500">Livraison réelle</p>
                    <p className="font-medium text-green-600">{formatDate(order.actualDeliveryDate)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Paiements ({order.payments.length})
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/paiements">+ Paiement</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {order.payments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Aucun paiement</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reçu</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.receiptNumber}</TableCell>
                        <TableCell className="text-sm">{formatDate(p.paymentDate)}</TableCell>
                        <TableCell className="text-sm capitalize">{p.paymentType.replace("_", " ")}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(Number(p.amountOriginal))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Dépenses liées ({order.expenses.length})
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/depenses">+ Dépense</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {order.expenses.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Aucune dépense liée</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Libellé</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.expenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{e.label ?? e.category?.name ?? "—"}</TableCell>
                        <TableCell className="text-sm">{formatDate(e.expenseDate)}</TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {formatCurrency(Number(e.amountOriginal))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-4">
          {/* Financial Summary */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Résumé financier</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Prix de vente</span>
                <span className="font-semibold">{formatCurrency(Number(order.sellingPrice))} {order.currency.code}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total payé</span>
                <span className="font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Solde dû</span>
                <span className={`font-semibold ${balanceDue > 0 ? "text-orange-600" : "text-green-600"}`}>
                  {formatCurrency(balanceDue)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Coût production</span>
                <span className="font-semibold text-red-600">{formatCurrency(totalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Marge brute</span>
                <span className={`font-semibold ${grossMargin >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  {formatCurrency(grossMargin)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historique des statuts</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="space-y-3">
                {order.statusHistory.map((h, i) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${i === 0 ? "bg-blue-500" : "bg-gray-300"}`} />
                      {i < order.statusHistory.length - 1 && (
                        <div className="w-px flex-1 bg-gray-200 mt-1" />
                      )}
                    </div>
                    <div className="pb-3">
                      <p className="text-xs font-medium">
                        {STATUS_CONFIG[h.newStatus]?.label ?? h.newStatus}
                      </p>
                      {h.note && <p className="text-xs text-gray-500">{h.note}</p>}
                      <p className="text-xs text-gray-400">{formatDateTime(h.changedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
