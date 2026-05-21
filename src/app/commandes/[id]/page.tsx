import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderById } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { ArrowLeft, User, Calendar, CreditCard, Receipt, Edit2, Package, FileText } from "lucide-react";
import { OrderStatusChanger } from "./order-status-changer";
import { InvoiceButton } from "./invoice-button";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  brouillon: { label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  confirmee: { label: "Confirmée", color: "bg-blue-100 text-blue-700" },
  mesures_prises: { label: "Mesures prises", color: "bg-blue-100 text-blue-700" },
  tissu_achete: { label: "Tissu acheté", color: "bg-cyan-100 text-cyan-700" },
  coupe: { label: "Coupe", color: "bg-yellow-100 text-yellow-700" },
  couture: { label: "Couture", color: "bg-orange-100 text-orange-700" },
  essayage: { label: "Essayage", color: "bg-amber-100 text-amber-700" },
  retouches: { label: "Retouches", color: "bg-yellow-100 text-yellow-700" },
  finition: { label: "Finition", color: "bg-orange-100 text-orange-700" },
  pret_livraison: { label: "Prêt livraison", color: "bg-emerald-100 text-emerald-700" },
  livree: { label: "Livrée", color: "bg-green-100 text-green-700" },
  annulee: { label: "Annulée", color: "bg-red-100 text-red-700" },
};

export default async function CommandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) notFound();

  const totalPaid = order.payments.reduce((sum, p) => sum + Number(p.amountOriginal), 0);
  const totalCost = order.expenses.reduce((sum, e) => sum + Number(e.amountOriginal), 0);
  const balanceDue = Number(order.sellingPrice) - totalPaid;
  const grossMargin = Number(order.sellingPrice) - totalCost;
  const config = STATUS_CONFIG[order.currentStatus] ?? { label: order.currentStatus, color: "" };
  const subtotal = Number(order.subtotal ?? order.sellingPrice);
  const discount = Number(order.discount ?? 0);
  const bonus = Number(order.bonus ?? 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/commandes"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Commande {order.orderNumber}</h1>
            <p className="text-sm text-gray-500">Créée le {formatDate(order.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${config.color}`}>
            {config.label}
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/commandes/${id}/modifier`}><Edit2 className="w-4 h-4 mr-1" />Modifier</Link>
          </Button>
          <InvoiceButton
            orderId={id}
            clientId={order.client.id}
            currencyId={order.currencyId}
            hasInvoice={order.invoices.length > 0 || (order.invoiceItems?.length ?? 0) > 0}
            existingInvoiceId={order.invoices[0]?.id ?? order.invoiceItems?.[0]?.invoiceId}
          />
          <OrderStatusChanger orderId={id} currentStatus={order.currentStatus} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client Info */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Client</p>
                  <Link href={`/clients/${order.client.id}`} className="font-semibold hover:underline">
                    {order.client.fullName}
                  </Link>
                  {order.client.phone && <p className="text-sm text-gray-500">{order.client.phone}</p>}
                </div>
              </div>
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

          {/* Order Lines */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Articles commandés ({order.lines.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Qté</TableHead>
                    <TableHead className="text-right">Prix unit.</TableHead>
                    <TableHead className="text-right">Sous-total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-gray-400">Aucune ligne</TableCell>
                    </TableRow>
                  ) : order.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{line.description || line.article?.name || "—"}</p>
                        {line.article && line.description && (
                          <p className="text-xs text-gray-400">{line.article.name}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{line.quantity}</TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(Number(line.unitPrice))} {order.currency.code}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {formatCurrency(Number(line.lineTotal))} {order.currency.code}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                        <TableCell className="text-sm capitalize">{p.paymentType.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(Number(p.amountOriginal))} {p.currency.code}
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

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Financial Summary */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Résumé financier</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sous-total</span>
                <span className="font-medium">{formatCurrency(subtotal)} {order.currency.code}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Remise</span>
                  <span className="text-orange-600">- {formatCurrency(discount)}</span>
                </div>
              )}
              {bonus > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Bonus</span>
                  <span className="text-orange-600">- {formatCurrency(bonus)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-blue-700">{formatCurrency(Number(order.sellingPrice))} {order.currency.code}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total payé</span>
                <span className="font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Solde dû</span>
                <span className={`font-semibold ${balanceDue > 0 ? "text-orange-600" : "text-green-600"}`}>
                  {formatCurrency(balanceDue)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Coût production</span>
                <span className="font-semibold text-red-600">{formatCurrency(totalCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Marge brute</span>
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
