"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ALL_MODULES, type AppModule, type UserPermissions } from "@/lib/permissions";

export async function saveUserPermissions(
  targetUserId: string,
  perms: UserPermissions,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };

  const caller = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!caller || caller.role !== "admin") {
    return { success: false, error: "Accès refusé — réservé à l'administrateur" };
  }

  const target = await prisma.profile.findUnique({
    where: { id: targetUserId },
    select: { role: true },
  });
  if (!target) return { success: false, error: "Utilisateur introuvable" };
  if (target.role === "admin" || target.role === "manager") {
    return { success: false, error: "Les permissions de cet utilisateur ne sont pas configurables" };
  }

  await prisma.$transaction(
    ALL_MODULES.map((mod: AppModule) =>
      prisma.userModulePermission.upsert({
        where: { userId_module: { userId: targetUserId, module: mod } },
        update: {
          canView:   perms[mod].canView,
          canCreate: perms[mod].canCreate,
          canEdit:   perms[mod].canEdit,
          canDelete: perms[mod].canDelete,
        },
        create: {
          userId:    targetUserId,
          module:    mod,
          canView:   perms[mod].canView,
          canCreate: perms[mod].canCreate,
          canEdit:   perms[mod].canEdit,
          canDelete: perms[mod].canDelete,
        },
      }),
    ),
  );

  return { success: true };
}
