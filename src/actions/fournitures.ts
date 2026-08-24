"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateSupplyCode } from "@/lib/utils";
import type { SupplyUnit } from "@prisma/client";

async function requirePermission(action: "canCreate" | "canEdit" | "canDelete" | "canView") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true, id: true },
  });
  if (!profile) throw new Error("Profil introuvable");

  if (profile.role === "admin" || profile.role === "manager") return profile;

  const perm = await prisma.userModulePermission.findUnique({
    where: { userId_module: { userId: user.id, module: "fournitures" } },
  });
  if (!perm || !perm[action]) throw new Error("Accès refusé");
  return profile;
}

// ─── Supply CRUD ─────────────────────────────────────────────────────────────

export async function createSupply(formData: FormData) {
  await requirePermission("canCreate");

  const name = (formData.get("name") as string)?.trim();
  const unit = formData.get("unit") as SupplyUnit;
  const categoryId = (formData.get("categoryId") as string) || null;
  const minimumStock = parseFloat((formData.get("minimumStock") as string) || "0");
  const description = (formData.get("description") as string)?.trim() || null;
  const defaultSupplierId = (formData.get("defaultSupplierId") as string) || null;
  const referencePrice = formData.get("referencePrice") ? parseFloat(formData.get("referencePrice") as string) : null;
  const defaultLocationId = (formData.get("defaultLocationId") as string) || null;

  if (!name || !unit) throw new Error("Nom et unité requis");

  const code = generateSupplyCode();

  await prisma.supply.create({
    data: {
      code,
      name,
      unit,
      categoryId: categoryId || undefined,
      minimumStock,
      description,
      defaultSupplierId: defaultSupplierId || undefined,
      referencePrice,
      defaultLocationId: defaultLocationId || undefined,
    },
  });

  revalidatePath("/fournitures");
  redirect("/fournitures/liste");
}

export async function updateSupply(id: string, formData: FormData) {
  await requirePermission("canEdit");

  const name = (formData.get("name") as string)?.trim();
  const unit = formData.get("unit") as SupplyUnit;
  const categoryId = (formData.get("categoryId") as string) || null;
  const minimumStock = parseFloat((formData.get("minimumStock") as string) || "0");
  const description = (formData.get("description") as string)?.trim() || null;
  const defaultSupplierId = (formData.get("defaultSupplierId") as string) || null;
  const referencePrice = formData.get("referencePrice") ? parseFloat(formData.get("referencePrice") as string) : null;
  const defaultLocationId = (formData.get("defaultLocationId") as string) || null;
  const isActive = formData.get("isActive") === "true";

  await prisma.supply.update({
    where: { id },
    data: {
      name,
      unit,
      categoryId: categoryId || null,
      minimumStock,
      description,
      defaultSupplierId: defaultSupplierId || null,
      referencePrice,
      defaultLocationId: defaultLocationId || null,
      isActive,
    },
  });

  revalidatePath("/fournitures");
  redirect(`/fournitures/liste/${id}`);
}

export async function toggleSupplyActive(id: string, isActive: boolean) {
  await requirePermission("canEdit");
  await prisma.supply.update({ where: { id }, data: { isActive } });
  revalidatePath("/fournitures/liste");
}

// ─── Category CRUD ───────────────────────────────────────────────────────────

export async function createCategory(formData: FormData) {
  await requirePermission("canCreate");
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Nom requis");
  await prisma.supplyCategory.create({ data: { name, description: (formData.get("description") as string) || null } });
  revalidatePath("/fournitures");
}

// ─── Location CRUD ───────────────────────────────────────────────────────────

export async function createLocation(formData: FormData) {
  await requirePermission("canCreate");
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Nom requis");
  await prisma.stockLocation.create({ data: { name, description: (formData.get("description") as string) || null } });
  revalidatePath("/fournitures");
}
