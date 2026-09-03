import { ModuleGuard } from "@/components/layout/module-guard";

export default function FournituresListeLayout({ children }: { children: React.ReactNode }) {
  return <ModuleGuard module="fournitures">{children}</ModuleGuard>;
}
