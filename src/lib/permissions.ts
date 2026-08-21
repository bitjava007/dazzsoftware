import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  ALL_MODULES,
  type AppModule,
  type ModulePerms,
  type UserPermissions,
} from "@/lib/permissions-shared";

export { ALL_MODULES, type AppModule, type ModulePerms, type UserPermissions };

const FULL_ACCESS: ModulePerms = { canView: true, canCreate: true, canEdit: true, canDelete: true };
const NO_ACCESS: ModulePerms = { canView: false, canCreate: false, canEdit: false, canDelete: false };

// Roles that bypass the fine-grained permission table.
export const UNRESTRICTED_ROLES = ["admin", "manager"] as const;

// Roles whose access is driven by UserModulePermission rows.
export const CONFIGURABLE_ROLES = ["accountant", "tailor", "user_basic"] as const;

function fullPermissions(): UserPermissions {
  return Object.fromEntries(ALL_MODULES.map((m) => [m, FULL_ACCESS])) as UserPermissions;
}

function emptyPermissions(): UserPermissions {
  return Object.fromEntries(ALL_MODULES.map((m) => [m, { ...NO_ACCESS }])) as UserPermissions;
}

/**
 * Returns the current user's effective permissions for every module.
 * Result is cached per request (React.cache) so multiple layouts calling
 * this in the same render tree only hit the database once.
 */
export const getMyPermissions = cache(async (): Promise<UserPermissions> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return emptyPermissions();

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!profile) return emptyPermissions();

  if ((UNRESTRICTED_ROLES as readonly string[]).includes(profile.role)) {
    return fullPermissions();
  }

  const rows = await prisma.userModulePermission.findMany({
    where: { userId: user.id },
    select: { module: true, canView: true, canCreate: true, canEdit: true, canDelete: true },
  });

  const perms = emptyPermissions();
  for (const row of rows) {
    const mod = row.module as AppModule;
    if (mod in perms) {
      perms[mod] = {
        canView: row.canView,
        canCreate: row.canCreate,
        canEdit: row.canEdit,
        canDelete: row.canDelete,
      };
    }
  }
  return perms;
});

/**
 * Returns all module permissions for a specific user (admin use only).
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!profile) return emptyPermissions();

  if ((UNRESTRICTED_ROLES as readonly string[]).includes(profile.role)) {
    return fullPermissions();
  }

  const rows = await prisma.userModulePermission.findMany({
    where: { userId },
    select: { module: true, canView: true, canCreate: true, canEdit: true, canDelete: true },
  });

  const perms = emptyPermissions();
  for (const row of rows) {
    const mod = row.module as AppModule;
    if (mod in perms) {
      perms[mod] = {
        canView: row.canView,
        canCreate: row.canCreate,
        canEdit: row.canEdit,
        canDelete: row.canDelete,
      };
    }
  }
  return perms;
}
