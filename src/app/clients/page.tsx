import Link from "next/link";
import { getClients } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Users, Eye, Phone, Mail } from "lucide-react";
import { ClientsTable } from "./clients-table";

export default async function ClientsPage() {
  const clients = await getClients();

  const clientsWithStats = clients.map((client) => {
    const totalRevenue = client.orders.reduce(
      (sum, order) => sum + Number(order.sellingPrice),
      0
    );
    const totalPaid = client.orders.reduce(
      (sum, order) =>
        sum +
        order.payments.reduce((s, p) => s + Number(p.amountOriginal), 0),
      0
    );
    return {
      ...client,
      totalRevenue,
      balanceDue: totalRevenue - totalPaid,
    };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">
            {clients.length} client{clients.length !== 1 ? "s" : ""} enregistré{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/clients/nouveau">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau client
            </Link>
          </Button>
        </div>
      </div>

      <ClientsTable clients={clientsWithStats} />
    </div>
  );
}
