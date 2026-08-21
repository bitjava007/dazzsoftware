import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyPermissions, ALL_MODULES, type AppModule } from "@/lib/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { getBranding } from "@/lib/branding";

export async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const [branding, perms] = await Promise.all([getBranding(), getMyPermissions()]);
  const visibleModules = ALL_MODULES.filter((m: AppModule) => perms[m].canView);

  return <AppShell branding={branding} visibleModules={visibleModules}>{children}</AppShell>;
}
