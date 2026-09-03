import { getPayments } from "@/actions/payments";
import { getOrders } from "@/actions/orders";
import { getCurrencies } from "@/actions/dashboard";
import { getMyPermissions } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { PaiementsContent } from "./paiements-content";

export default async function PaiementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [payments, orders, currencies, perms] = await Promise.all([
    getPayments(),
    getOrders(),
    getCurrencies(),
    getMyPermissions(),
  ]);

  const paiPerms = perms["paiements"];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paiements clients</h1>
        <p className="text-sm text-gray-500 mt-1">Suivi des paiements reçus</p>
      </div>
      <PaiementsContent
        payments={payments}
        orders={orders}
        currencies={currencies}
        currentUserId={user?.id ?? ""}
        canCreate={paiPerms.canCreate}
        canValidate={paiPerms.canValidate}
        canCancel={paiPerms.canCancel}
        canDelete={paiPerms.canDelete}
      />
    </div>
  );
}
