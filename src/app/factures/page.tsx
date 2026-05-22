import { getInvoices, getEligibleOrders } from "@/actions/invoices";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { FacturesContent } from "./factures-content";

export default async function FacturesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [invoices, eligibleOrders, clients] = await Promise.all([
    getInvoices(),
    getEligibleOrders(),
    user
      ? prisma.client.findMany({
          where: { deletedAt: null },
          select: { id: true, fullName: true },
          orderBy: { fullName: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const currencies = user
    ? await prisma.currency.findMany({ where: { isActive: true }, select: { id: true, code: true } })
    : [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
        <p className="text-sm text-gray-500 mt-1">Gestion des factures clients</p>
      </div>
      <FacturesContent
        invoices={invoices}
        eligibleOrders={eligibleOrders}
        clients={clients}
        currencies={currencies}
      />
    </div>
  );
}
