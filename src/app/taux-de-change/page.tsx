import { getExchangeRates, getActiveCurrencies } from "@/actions/exchange-rates";
import { TauxDeChangeContent } from "./taux-de-change-content";

export default async function TauxDeChangePage() {
  const [rates, currencies] = await Promise.all([
    getExchangeRates(),
    getActiveCurrencies(),
  ]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Taux de change</h1>
        <p className="text-sm text-gray-500 mt-1">Gérez les taux de conversion entre devises</p>
      </div>
      <TauxDeChangeContent rates={rates as any} currencies={currencies} />
    </div>
  );
}
