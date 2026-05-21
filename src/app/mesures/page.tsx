import { getMeasurements } from "@/actions/measurements";
import { getClients } from "@/actions/clients";
import { MesuresContent } from "./mesures-content";

export default async function MesuresPage() {
  const [measurements, clients] = await Promise.all([
    getMeasurements(),
    getClients(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mesures</h1>
        <p className="text-sm text-gray-500 mt-1">Fiches de mesures clients</p>
      </div>
      <MesuresContent measurements={measurements} clients={clients} />
    </div>
  );
}
