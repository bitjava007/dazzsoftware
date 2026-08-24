import { prisma } from "@/lib/prisma";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { SortieForm } from "./sortie-form";

export default async function NouvelleSortiePage() {
  const [supplies, locations] = await Promise.all([
    prisma.supply.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, unit: true, code: true } }),
    prisma.stockLocation.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  // Get current balances for display
  const balances = await prisma.stockBalance.findMany({ select: { supplyId: true, locationId: true, quantity: true } });

  return (
    <div>
      <FournituresNav />
      <SortieForm supplies={supplies} locations={locations} balances={balances} />
    </div>
  );
}
