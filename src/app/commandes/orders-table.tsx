"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
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

const ALL_STATUSES = Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({ value, label }));

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filtered = orders.filter((o) => {
    const text = search.toLowerCase();
    const matchText = !text ||
      o.orderNumber.toLowerCase().includes(text) ||
      o.client.fullName.toLowerCase().includes(text) ||
      o.lines.some((l) => l.article?.name.toLowerCase().includes(text));
    const matchStatus = statusFilter === "all" || o.currentStatus === statusFilter;
    const d = new Date(o.orderDate);
    const matchStart = !startDate || d >= new Date(startDate);
    const matchEnd = !endDate || d <= new Date(endDate + "T23:59:59");
    return matchText && matchStatus && matchStart && matchEnd;
  });

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setStatusFilter("all");
    setSearch("");
  };

  return (
    <Card className="border-0 shadow-sm">
      {/* Filters */}
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-8 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-sm w-full sm:w-44">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangeFilter
            startDate={startDate} endDate={endDate}
            onStartDateChange={setStartDate} onEndDateChange={setEndDate}
            onReset={resetFilters}
          />
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Commande</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="hidden sm:table-cell">Articles</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right hidden md:table-cell">Payé</TableHead>
              <TableHead className="text-right hidden md:table-cell">Solde</TableHead>
              <TableHead className="hidden lg:table-cell">Date</TableHead>
              <TableHead className="hidden xl:table-cell">Livraison</TableHead>
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
            ) : filtered.map((order) => {
              const sellingPrice = Number(order.sellingPrice);
              const totalPaid = order.payments.reduce((s, p) => s + Number(p.amountOriginal), 0);
              const balance = sellingPrice - totalPaid;
              const articleSummary = order.lines.length === 0
                ? "—"
                : order.lines.length === 1
                  ? (order.lines[0].article?.name ?? "Article")
                  : `${order.lines.length} articles`;
              const config = STATUS_CONFIG[order.currentStatus] ?? { label: order.currentStatus, variant: "outline" as const };

              return (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm font-medium">{order.orderNumber}</TableCell>
                  <TableCell className="text-sm">{order.client.fullName}</TableCell>
                  <TableCell className="hidden sm:table-cell text-gray-500 text-sm">{articleSummary}</TableCell>
                  <TableCell>
                    <Badge variant={config.variant} className="text-xs whitespace-nowrap">{config.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    {formatCurrency(sellingPrice)}
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell text-green-600 text-sm">
                    {formatCurrency(totalPaid)}
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell text-sm">
                    <span className={balance > 0 ? "text-orange-600 font-medium" : "text-green-600"}>
                      {formatCurrency(balance)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                    {formatDate(order.orderDate)}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-sm text-gray-500">
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
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
