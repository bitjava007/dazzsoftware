import { getInvoices } from "@/actions/invoices";
import { FacturesContent } from "./factures-content";

export default async function FacturesPage() {
  const invoices = await getInvoices();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
        <p className="text-sm text-gray-500 mt-1">Gestion des factures clients</p>
      </div>
      <FacturesContent invoices={invoices} />
    </div>
  );
}
