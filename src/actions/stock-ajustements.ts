"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateAdjustmentRef } from "@/lib/utils";
import type { AdjustmentReason } from "@prisma/client";

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
    where: { userId_module: { userId, module: "fournitures_ajustements" } },
    select: { [action]: true },
  });
  if (!(perm as Record<string, boolean> | null)?.[action]) throw new Error("Accès refusé");
}

// Create adjustment as a DRAFT — stock is NOT updated yet
export async function createAdjustment(formData: FormData) {
  const profile = await getProfile();
  await requirePerm(profile.id, profile.role, "canCreate");

  const date    = new Date(formData.get("date") as string);
  const reason  = formData.get("reason") as AdjustmentReason;
  const comment = (formData.get("comment") as string) || null;

  const linesRaw = formData.get("lines") as string;
  const lines: { supplyId: string; locationId: string; newQuantity: number }[] = JSON.parse(linesRaw || "[]");
  if (!lines.length) throw new Error("Au moins une ligne requise");

  const adjLines = await Promise.all(
    lines.map(async (l) => {
      const balance = await prisma.stockBalance.findUnique({
        where: { supplyId_locationId: { supplyId: l.supplyId, locationId: l.locationId } },
      });
      const qtyBefore = Number(balance?.quantity ?? 0);
      return {
        supplyId:       l.supplyId,
        locationId:     l.locationId,
        quantityBefore: qtyBefore,
        quantityAfter:  l.newQuantity,
        quantityDelta:  l.newQuantity - qtyBefore,
      };
    })
  );

  const adjustment = await prisma.stockAdjustment.create({
    data: {
      reference:   generateAdjustmentRef(),
      date,
      reason,
      comment,
      status:      "draft",
      createdById: profile.id,
      lines: { create: adjLines },
    },
  });

  revalidatePath("/fournitures");
  redirect(`/fournitures/ajustements/${adjustment.id}`);
}

// Validate a draft adjustment — applies stock changes
export async function validateAdjustment(id: string) {
  const profile = await getProfile();
  await requirePerm(profile.id, profile.role, "canValidate");

  const adjustment = await prisma.stockAdjustment.findUnique({
    where:   { id },
    include: { lines: true },
  });
  if (!adjustment) throw new Error("Ajustement introuvable");
  if (adjustment.status !== "draft") throw new Error("Cet ajustement est déjà validé ou annulé");

  // Maker-checker
  if (profile.role !== "admin" && adjustment.createdById === profile.id) {
    throw new Error("Vous ne pouvez pas valider votre propre ajustement (principe de séparation des responsabilités)");
  }

  await prisma.$transaction(async (tx) => {
    for (const adj of adjustment.lines) {
      await tx.stockBalance.upsert({
        where:  { supplyId_locationId: { supplyId: adj.supplyId, locationId: adj.locationId } },
        update: { quantity: adj.quantityAfter },
        create: { supplyId: adj.supplyId, locationId: adj.locationId, quantity: adj.quantityAfter },
      });

      const supply = await tx.supply.findUnique({ where: { id: adj.supplyId }, select: { unit: true } });
      await tx.stockMovement.create({
        data: {
          reference:      adjustment.reference,
          type:           "adjustment",
          supplyId:       adj.supplyId,
          quantity:       Math.abs(Number(adj.quantityDelta)),
          unit:           supply!.unit,
          fromLocationId: Number(adj.quantityDelta) < 0 ? adj.locationId : null,
          toLocationId:   Number(adj.quantityDelta) > 0 ? adj.locationId : null,
          reason:         adjustment.reason,
          comment:        adjustment.comment,
          createdById:    profile.id,
        },
      });
    }

    await tx.stockAdjustment.update({
      where: { id },
      data:  { status: "validated", validatedById: profile.id, validatedAt: new Date() },
    });
  });

  revalidatePath("/fournitures");
  redirect(`/fournitures/ajustements/${id}`);
}

// Cancel a draft adjustment — no stock changes to undo
export async function cancelAdjustment(id: string) {
  const profile = await getProfile();
  await requirePerm(profile.id, profile.role, "canCancel");

  const adjustment = await prisma.stockAdjustment.findUnique({ where: { id } });
  if (!adjustment) throw new Error("Ajustement introuvable");
  if (adjustment.status !== "draft") throw new Error("Seuls les brouillons peuvent être annulés");

  // Maker-checker
  if (profile.role !== "admin" && adjustment.createdById === profile.id) {
    throw new Error("Vous ne pouvez pas annuler votre propre ajustement (principe de séparation des responsabilités)");
  }

  await prisma.stockAdjustment.update({
    where: { id },
    data:  { status: "cancelled", validatedById: profile.id, validatedAt: new Date() },
  });

  revalidatePath("/fournitures/ajustements");
  redirect("/fournitures/ajustements");
}
