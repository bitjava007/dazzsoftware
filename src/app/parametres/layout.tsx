import { ProtectedLayout } from "@/components/layout/protected-layout";
import { ModuleGuard } from "@/components/layout/module-guard";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout><ModuleGuard module="parametres">{children}</ModuleGuard></ProtectedLayout>;
}
