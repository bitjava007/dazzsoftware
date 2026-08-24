import { prisma } from "@/lib/prisma";
import { FournituresNav } from "@/components/fournitures/fournitures-nav";
import { EntreeForm } from "./entree-form";

export default async function NouvelleEntreePage() {
  const [supplies, suppliers, locations] = await Promise.all([
    prisma.supply.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, unit: true, code: true } }),
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.stockLocation.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <FournituresNav />
      <EntreeForm supplies={supplies} suppliers={suppliers} locations={locations} />
    </div>
  );
}
