import { getMyPermissions } from "@/lib/permissions";
import { FOURNITURES_MODULES, type AppModule } from "@/lib/permissions-shared";
import { FournituresNavClient } from "./fournitures-nav-client";

export async function FournituresNav() {
  const perms = await getMyPermissions();
  const visibleModules = FOURNITURES_MODULES.filter((m) => perms[m].canView) as AppModule[];
  return <FournituresNavClient visibleModules={visibleModules} />;
}
