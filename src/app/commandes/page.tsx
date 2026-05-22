import Link from "next/link";
import { getOrders } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Eye } from "lucide-react";
import { OrdersTable } from "./orders-table";

export default async function CommandesPage() {
  const orders = await getOrders();

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {orders.length} commande{orders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/commandes/nouvelle">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle commande
          </Link>
        </Button>
      </div>

      <OrdersTable orders={orders} />
    </div>
  );
}
