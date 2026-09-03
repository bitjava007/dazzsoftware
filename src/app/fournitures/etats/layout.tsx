import { ModuleGuard } from "@/components/layout/module-guard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ModuleGuard module="fournitures_etat_stock">{children}</ModuleGuard>;
}
