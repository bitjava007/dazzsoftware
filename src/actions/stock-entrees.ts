"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateEntryRef } from "@/lib/utils";

async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true, id: true } });
  if (!profile) throw new Error("Profil introuvable");
  return profile;
}

async function requirePerm(userId: string, role: string, action: "canCreate" | "canValidate" | "canCancel") {
  if (role === "admin" || role === "manager") return;
  const perm = await prisma.userModulePermission.findUnique({
    where: { userId_module: { userId, module: "fournitures_entrees" } },
    select: { [action]: true },
  });
  if (!(perm as Record<string, boolean> | null)?.[action]) throw new Error("Accès refusé");
}

export async function createStockEntry(formData: FormData) {
  const profile = await getProfile();
  await requirePerm(profile.id, profile.role, "canCreate");

  const date = new Date(formData.get("date") as string);
  const supplierId = (formData.get("supplierId") as string) || null;
  const supplierInvoice = (formData.get("supplierInvoice") as string) || null;
  const comment = (formData.get("comment") as string) || null;

  const linesRaw = formData.get("lines") as string;
  const lines: { supplyId: string; locationId: string; quantity: number; unitCost: number }[] = JSON.parse(linesRaw || "[]");
  if (!lines.length) throw new Error("Au moins une fourniture requise");

  const totalAmount = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  const entry = await prisma.stockEntry.create({
    data: {
      reference: generateEntryRef(),
      date,
      supplierId: supplierId || undefined,
      supplierInvoice,
      comment,
      totalAmount,
      createdById: profile.id,
      lines: {
        create: lines.map((l) => ({
          supplyId:   l.supplyId,
          locationId: l.locationId,
          quantity:   l.quantity,
          unitCost:   l.unitCost,
          totalCost:  l.quantity * l.unitCost,
        })),
      },
    },
  });

  revalidatePath("/fournitures");
  redirect(`/fournitures/entrees/${entry.id}`);
}

export async function validateStockEntry(id: string) {
  const profile = await getProfile();
  await requirePerm(profile.id, profile.role, "canValidate");

  const entry = await prisma.stockEntry.findUnique({ where: { id }, include: { lines: true } });
  if (!entry) throw new Error("Entrée introuvable");
  if (entry.status !== "draft") throw new Error("Cette entrée est déjà validée ou annulée");

  // Maker-checker: validator cannot be the creator (except Super Admin)
  if (profile.role !== "admin" && entry.createdById === profile.id) {
    throw new Error("Vous ne pouvez pas valider votre propre opération (principe de séparation des responsabilités)");
  }

  await prisma.$transaction(async (tx) => {
    for (const line of entry.lines) {
      await tx.stockBalance.upsert({
        where:  { supplyId_locationId: { supplyId: line.supplyId, locationId: line.locationId } },
        update: { quantity: { increment: line.quantity } },
        create: { supplyId: line.supplyId, locationId: line.locationId, quantity: line.quantity },
      });

      const supply = await tx.supply.findUnique({ where: { id: line.supplyId }, select: { unit: true } });
      await tx.stockMovement.create({
        data: {
          reference:    entry.reference,
          type:         "entry",
          supplyId:     line.supplyId,
          quantity:     line.quantity,
          unit:         supply!.unit,
          toLocationId: line.locationId,
          unitCost:     line.unitCost,
          totalCost:    line.totalCost,
          createdById:  profile.id,
        },
      });
    }

    await tx.stockEntry.update({
      where: { id },
      data:  { status: "validated", validatedById: profile.id, validatedAt: new Date() },
    });
  });

  revalidatePath("/fournitures");
  redirect(`/fournitures/entrees/${id}`);
}

export async function cancelStockEntry(id: string) {
  const profile = await getProfile();
  await requirePerm(profile.id, profile.role, "canCancel");

  const entry = await prisma.stockEntry.findUnique({ where: { id } });
  if (!entry) throw new Error("Entrée introuvable");
  if (entry.status !== "draft") throw new Error("Seuls les brouillons peuvent être annulés");

  // Maker-checker
  if (profile.role !== "admin" && entry.createdById === profile.id) {
    throw new Error("Vous ne pouvez pas annuler votre propre opération (principe de séparation des responsabilités)");
  }

  await prisma.stockEntry.update({
    where: { id },
    data:  { status: "cancelled", validatedById: profile.id, validatedAt: new Date() },
  });

  revalidatePath("/fournitures/entrees");
  redirect("/fournitures/entrees");
}
