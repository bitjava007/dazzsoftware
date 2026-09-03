"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateInventoryRef, generateAdjustmentRef } from "@/lib/utils";

async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true, id: true } });
  if (!profile) throw new Error("Profil introuvable");
  return profile;
}

async function requirePerm(userId: string, role: string, action: "canCreate" | "canValidate" | "canCancel") {
  if (role === "admin") return;
  const perm = await prisma.userModulePermission.findUnique({
    where: { userId_module: { userId, module: "fournitures_inventaire" } },
    select: { [action]: true },
  });
  if (!(perm as Record<string, boolean> | null)?.[action]) throw new Error("Accès refusé");
}

export async function createInventorySession(formData: FormData) {
  const profile = await getProfile();
  await requirePerm(profile.id, profile.role, "canCreate");

  const date       = new Date(formData.get("date") as string);
  const locationId = (formData.get("locationId") as string) || null;
  const comment    = (formData.get("comment") as string) || null;

  const balances = await prisma.stockBalance.findMany({
    where: locationId ? { locationId } : undefined,
    include: { supply: true },
  });

  const session = await prisma.inventorySession.create({
    data: {
      reference:   generateInventoryRef(),
      date,
      locationId:  locationId || undefined,
      comment,
      status:      "in_progress",
      createdById: profile.id,
      lines: {
        create: balances.map((b) => ({
          supplyId:      b.supplyId,
          locationId:    b.locationId,
          theoreticalQty: b.quantity,
          physicalQty:   null,
          variance:      null,
        })),
      },
    },
  });

  revalidatePath("/fournitures/inventaire");
  redirect(`/fournitures/inventaire/${session.id}`);
}

export async function updateInventoryLine(lineId: string, physicalQty: number) {
  await getProfile();

  const line = await prisma.inventoryLine.findUnique({ where: { id: lineId } });
  if (!line) throw new Error("Ligne introuvable");

  const variance = physicalQty - Number(line.theoreticalQty);
  await prisma.inventoryLine.update({
    where: { id: lineId },
    data:  { physicalQty, variance },
  });

  revalidatePath(`/fournitures/inventaire/${line.sessionId}`);
}

export async function validateInventorySession(id: string) {
  const profile = await getProfile();
  await requirePerm(profile.id, profile.role, "canValidate");

  const session = await prisma.inventorySession.findUnique({
    where:   { id },
    include: { lines: { include: { supply: true } } },
  });
  if (!session) throw new Error("Session introuvable");
  if (session.status === "validated") throw new Error("Déjà validé");

  // Maker-checker
  if (profile.role !== "admin" && session.createdById === profile.id) {
    throw new Error("Vous ne pouvez pas valider votre propre inventaire (principe de séparation des responsabilités)");
  }

  const unset = session.lines.filter((l) => l.physicalQty === null);
  if (unset.length > 0) throw new Error("Toutes les quantités physiques doivent être saisies avant validation");

  const adjustmentRef = generateAdjustmentRef();

  await prisma.$transaction(async (tx) => {
    const adjLines = session.lines
      .filter((l) => l.physicalQty !== null && Number(l.physicalQty) !== Number(l.theoreticalQty))
      .map((l) => ({
        supplyId:       l.supplyId,
        locationId:     l.locationId,
        quantityBefore: l.theoreticalQty,
        quantityAfter:  l.physicalQty!,
        quantityDelta:  Number(l.physicalQty!) - Number(l.theoreticalQty),
      }));

    if (adjLines.length > 0) {
      await tx.stockAdjustment.create({
        data: {
          reference:      adjustmentRef,
          date:           new Date(),
          reason:         "inventaire",
          comment:        `Ajustement suite à l'inventaire ${session.reference}`,
          status:         "validated",
          createdById:    profile.id,
          validatedById:  profile.id,
          validatedAt:    new Date(),
          lines: { create: adjLines },
        },
      });

      for (const adj of adjLines) {
        await tx.stockBalance.upsert({
          where:  { supplyId_locationId: { supplyId: adj.supplyId, locationId: adj.locationId } },
          update: { quantity: adj.quantityAfter },
          create: { supplyId: adj.supplyId, locationId: adj.locationId, quantity: adj.quantityAfter },
        });

        const supply = await tx.supply.findUnique({ where: { id: adj.supplyId }, select: { unit: true } });
        await tx.stockMovement.create({
          data: {
            reference:      adjustmentRef,
            type:           "inventory_adjustment",
            supplyId:       adj.supplyId,
            quantity:       Math.abs(adj.quantityDelta),
            unit:           supply!.unit,
            fromLocationId: adj.quantityDelta < 0 ? adj.locationId : null,
            toLocationId:   adj.quantityDelta > 0 ? adj.locationId : null,
            reason:         "inventaire",
            comment:        `Inventaire ${session.reference}`,
            createdById:    profile.id,
          },
        });
      }
    }

    await tx.inventorySession.update({
      where: { id },
      data:  { status: "validated", validatedById: profile.id, validatedAt: new Date() },
    });
  });

  revalidatePath("/fournitures");
  redirect(`/fournitures/inventaire/${id}`);
}

export async function cancelInventorySession(id: string) {
  const profile = await getProfile();
  await requirePerm(profile.id, profile.role, "canCancel");

  const session = await prisma.inventorySession.findUnique({ where: { id } });
  if (!session) throw new Error("Session introuvable");
  if (session.status === "validated") throw new Error("Une session validée ne peut pas être annulée");

  // Maker-checker
  if (profile.role !== "admin" && session.createdById === profile.id) {
    throw new Error("Vous ne pouvez pas annuler votre propre inventaire (principe de séparation des responsabilités)");
  }

  await prisma.inventorySession.update({
    where: { id },
    data:  { status: "cancelled" },
  });

  revalidatePath("/fournitures/inventaire");
  redirect("/fournitures/inventaire");
}
