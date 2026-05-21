"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Eye, Search } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  brouillon: { label: "Brouillon", variant: "outline" },
  confirmee: { label: "Confirmée", variant: "info" },
  mesures_prises: { label: "Mesures prises", variant: "info" },
  tissu_achete: { label: "Tissu acheté", variant: "info" },
  coupe: { label: "Coupe", variant: "warning" },
  couture: { label: "Couture", variant: "warning" },
  essayage: { label: "Essayage", variant: "warning" },
  retouches: { label: "Retouches", variant: "warning" },
  finition: { label: "Finition", variant: "warning" },
  pret_livraison: { label: "Prêt livraison", variant: "success" },
  livree: { label: "Livrée", variant: "success" },
  annulee: { label: "Annulée", variant: "destructive" },
};

interface Order {
  id: string;
  orderNumber: string;
  sellingPrice: unknown;
  currentStatus: string;
  orderDate: Date;
  expectedDeliveryDate: Date | null;
  client: { fullName: string };
  lines: { article: { name: string } | null; quantity: number; unitPrice: unknown; lineTotal: unknown }[];
  currency: { symbol: string; code: string };
  payments: { amountOriginal: unknown }[];
}

export function OrdersTable({ orders }: { orders: Order[] }) {
  const [search, setSearch] = useState("");

  const filtered = orders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.client.fullName.toLowerCase().includes(search.toLowerCase()) ||
      o.lines.some((l) => l.article?.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher une commande..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Commande</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Articles</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Prix vente</TableHead>
              <TableHead className="text-right">Payé</TableHead>
              <TableHead className="text-right">Solde</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Livraison prévue</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-gray-400">
                  Aucune commande trouvée
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => {
                const sellingPrice = Number(order.sellingPrice);
                const totalPaid = order.payments.reduce((s, p) => s + Number(p.amountOriginal), 0);
                const balance = sellingPrice - totalPaid;
                const articleSummary = order.lines.length === 0
                  ? "—"
                  : order.lines.length === 1
                    ? (order.lines[0].article?.name ?? "Article sans nom")
                    : `${order.lines.length} articles`;
                const config = STATUS_CONFIG[order.currentStatus] ?? { label: order.currentStatus, variant: "outline" as const };

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm font-medium">{order.orderNumber}</TableCell>
                    <TableCell>{order.client.fullName}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{articleSummary}</TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sellingPrice)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(totalPaid)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={balance > 0 ? "text-orange-600 font-medium" : "text-green-600"}>
                        {formatCurrency(balance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(order.orderDate)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(order.expectedDeliveryDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/commandes/${order.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
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
