"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

const ALLOWED_ROLES: Role[] = ["manager", "accountant", "tailor", "user_basic"];

export async function createUser(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const caller = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (caller?.role !== "admin") throw new Error("Accès refusé");

  const fullName = (formData.get("fullName") as string)?.trim();
  const email    = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const role     = formData.get("role") as Role;

  if (!fullName || !email || !password || !role) throw new Error("Champs manquants");
  if (!ALLOWED_ROLES.includes(role)) throw new Error("Rôle invalide");
  if (password.length < 8) throw new Error("Mot de passe trop court (8 caractères minimum)");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw new Error(error.message);

  await prisma.profile.upsert({
    where: { id: data.user.id },
    update: { fullName, role, isActive: true },
    create: { id: data.user.id, fullName, role, isActive: true },
  });

  redirect("/utilisateurs");
}

export async function toggleUserActive(targetId: string, isActive: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const caller = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (caller?.role !== "admin") throw new Error("Accès refusé");

  await prisma.profile.update({
    where: { id: targetId },
    data: { isActive },
  });
}
