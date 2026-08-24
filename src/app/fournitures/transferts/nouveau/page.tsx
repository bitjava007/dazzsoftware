import { prisma } from "@/lib/prisma";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { TransfertForm } from "./transfert-form";

export default async function NouveauTransfertPage() {
  const [supplies, locations, balances] = await Promise.all([
    prisma.supply.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, unit: true } }),
    prisma.stockLocation.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.stockBalance.findMany({ select: { supplyId: true, locationId: true, quantity: true } }),
  ]);

  return (
    <div>
      <FournituresNav />
      <TransfertForm supplies={supplies} locations={locations} balances={balances} />
    </div>
  );
}
