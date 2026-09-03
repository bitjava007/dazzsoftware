import { getExpenses, getExpenseCategories } from "@/actions/expenses";
import { getOrders } from "@/actions/orders";
import { getCurrencies } from "@/actions/dashboard";
import { getMyPermissions } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { DepensesContent } from "./depenses-content";

export default async function DepensesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [expenses, categories, orders, currencies, perms] = await Promise.all([
    getExpenses(),
    getExpenseCategories(),
    getOrders(),
    getCurrencies(),
    getMyPermissions(),
  ]);

  const depPerms = perms["depenses"];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dépenses</h1>
        <p className="text-sm text-gray-500 mt-1">Gestion des dépenses de l&apos;atelier</p>
      </div>
      <DepensesContent
        expenses={expenses}
        categories={categories}
        orders={orders}
        currencies={currencies}
        currentUserId={user?.id ?? ""}
        canCreate={depPerms.canCreate}
        canValidate={depPerms.canValidate}
        canCancel={depPerms.canCancel}
        canDelete={depPerms.canDelete}
      />
    </div>
  );
}
