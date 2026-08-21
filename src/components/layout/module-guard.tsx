import { redirect } from "next/navigation";
import { getMyPermissions } from "@/lib/permissions";
import type { AppModule } from "@/lib/permissions-shared";

interface Props {
  module: AppModule;
  children: React.ReactNode;
}

/** Server component — redirects to /dashboard when the current user lacks canView. */
export async function ModuleGuard({ module, children }: Props) {
  const perms = await getMyPermissions();
  if (!perms[module].canView) redirect("/dashboard");
  return <>{children}</>;
}
