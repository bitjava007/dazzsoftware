import { getPayments } from "@/actions/payments";
import { getOrders } from "@/actions/orders";
import { getCurrencies } from "@/actions/dashboard";
import { PaiementsContent } from "./paiements-content";

export default async function PaiementsPage() {
  const [payments, orders, currencies] = await Promise.all([
    getPayments(),
    getOrders(),
    getCurrencies(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paiements clients</h1>
        <p className="text-sm text-gray-500 mt-1">Suivi des paiements reçus</p>
      </div>
      <PaiementsContent payments={payments} orders={orders} currencies={currencies} />
    </div>
  );
}
