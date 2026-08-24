import { ProtectedLayout } from "@/components/layout/protected-layout";
import { ModuleGuard } from "@/components/layout/module-guard";

export default function FournituresLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedLayout>
      <ModuleGuard module="fournitures">{children}</ModuleGuard>
    </ProtectedLayout>
  );
}
