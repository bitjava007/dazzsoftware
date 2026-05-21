import { getExpenses, getExpenseCategories } from "@/actions/expenses";
import { getOrders } from "@/actions/orders";
import { getCurrencies } from "@/actions/dashboard";
import { DepensesContent } from "./depenses-content";

export default async function DepensesPage() {
  const [expenses, categories, orders, currencies] = await Promise.all([
    getExpenses(),
    getExpenseCategories(),
    getOrders(),
    getCurrencies(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dépenses</h1>
        <p className="text-sm text-gray-500 mt-1">Gestion des dépenses de l&apos;atelier</p>
      </div>
      <DepensesContent expenses={expenses} categories={categories} orders={orders} currencies={currencies} />
    </div>
  );
}
