import { getSettings } from "@/actions/settings";
import { getCurrencies } from "@/actions/dashboard";
import { SettingsForm } from "./settings-form";

export default async function ParametresPage() {
  const [settings, currencies] = await Promise.all([
    getSettings(),
    getCurrencies(),
  ]);

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-500 mt-1">Configuration de votre atelier</p>
      </div>
      <SettingsForm settings={settings} currencies={currencies} />
    </div>
  );
}
