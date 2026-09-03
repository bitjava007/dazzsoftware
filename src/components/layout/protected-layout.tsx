import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyPermissions } from "@/lib/permissions";
import { ALL_MODULES, FOURNITURES_MODULES, type AppModule } from "@/lib/permissions-shared";
import { AppShell } from "@/components/layout/app-shell";
import { getBranding } from "@/lib/branding";

export async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const [branding, perms] = await Promise.all([getBranding(), getMyPermissions()]);

  const visibleModules = ALL_MODULES.filter((m: AppModule) => perms[m].canView);

  // Show the "Fournitures" sidebar entry if the user has access to ANY sub-module,
  // even if the "fournitures" (supplies list) permission itself is not granted.
  const hasFournituresAccess = FOURNITURES_MODULES.some((m) => perms[m].canView);
  const effectiveModules: AppModule[] =
    hasFournituresAccess && !visibleModules.includes("fournitures")
      ? (["fournitures", ...visibleModules] as AppModule[])
      : visibleModules;

  return <AppShell branding={branding} visibleModules={effectiveModules}>{children}</AppShell>;
}
