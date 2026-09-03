"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateExitRef } from "@/lib/utils";
import type { ExitDestination, ExitReason } from "@prisma/client";

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
    where: { userId_module: { userId, module: "fournitures_sorties" } },
    select: { [action]: true },
  });
  if (!(perm as Record<string, boolean> | null)?.[action]) throw new Error("Accès refusé");
}

export async function createStockExit(formData: FormData) {
  const profile = await getProfile();
  await requirePerm(profile.id, profile.role, "canCreate");

  const date        = new Date(formData.get("date") as string);
  const destination = formData.get("destination") as ExitDestination;
  const reason      = formData.get("reason") as ExitReason;
  const externalRef = (formData.get("externalRef") as string) || null;
  const comment     = (formData.get("comment") as string) || null;

  const linesRaw = formData.get("lines") as string;
  const lines: { supplyId: string; locationId: string; quantity: number }[] = JSON.parse(linesRaw || "[]");
  if (!lines.length) throw new Error("Au moins une fourniture requise");

  // Check stock availability at creation time (informational — re-checked at validation)
  for (const line of lines) {
    const balance = await prisma.stockBalance.findUnique({
      where: { supplyId_locationId: { supplyId: line.supplyId, locationId: line.locationId } },
    });
    const available = Number(balance?.quantity ?? 0);
    if (available < line.quantity) {
      const supply = await prisma.supply.findUnique({ where: { id: line.supplyId }, select: { name: true, unit: true } });
      throw new Error(`Stock insuffisant pour "${supply?.name}". Disponible : ${available} ${supply?.unit}`);
    }
  }

  const exitRecord = await prisma.stockExit.create({
    data: {
      reference: generateExitRef(),
      date,
      destination,
      reason,
      externalRef,
      comment,
      createdById: profile.id,
      lines: {
        create: lines.map((l) => ({ supplyId: l.supplyId, locationId: l.locationId, quantity: l.quantity })),
      },
    },
  });

  revalidatePath("/fournitures");
  redirect(`/fournitures/sorties/${exitRecord.id}`);
}

export async function validateStockExit(id: string) {
  const profile = await getProfile();
  await requirePerm(profile.id, profile.role, "canValidate");

  const exitRecord = await prisma.stockExit.findUnique({ where: { id }, include: { lines: true } });
  if (!exitRecord) throw new Error("Sortie introuvable");
  if (exitRecord.status !== "draft") throw new Error("Cette sortie est déjà validée ou annulée");

  // Maker-checker
  if (profile.role !== "admin" && exitRecord.createdById === profile.id) {
    throw new Error("Vous ne pouvez pas valider votre propre opération (principe de séparation des responsabilités)");
  }

  await prisma.$transaction(async (tx) => {
    for (const line of exitRecord.lines) {
      const balance = await tx.stockBalance.findUnique({
        where: { supplyId_locationId: { supplyId: line.supplyId, locationId: line.locationId } },
      });
      const available = Number(balance?.quantity ?? 0);
      if (available < Number(line.quantity)) {
        const supply = await tx.supply.findUnique({ where: { id: line.supplyId }, select: { name: true, unit: true } });
        throw new Error(`Stock insuffisant pour "${supply?.name}". Disponible : ${available} ${supply?.unit}`);
      }

      await tx.stockBalance.update({
        where: { supplyId_locationId: { supplyId: line.supplyId, locationId: line.locationId } },
        data:  { quantity: { decrement: line.quantity } },
      });

      const supply = await tx.supply.findUnique({ where: { id: line.supplyId }, select: { unit: true } });
      await tx.stockMovement.create({
        data: {
          reference:      exitRecord.reference,
          type:           "exit",
          supplyId:       line.supplyId,
          quantity:       line.quantity,
          unit:           supply!.unit,
          fromLocationId: line.locationId,
          reason:         exitRecord.reason,
          comment:        exitRecord.comment,
          createdById:    profile.id,
        },
      });
    }

    await tx.stockExit.update({
      where: { id },
      data:  { status: "validated", validatedById: profile.id, validatedAt: new Date() },
    });
  });

  revalidatePath("/fournitures");
  redirect(`/fournitures/sorties/${id}`);
}

export async function cancelStockExit(id: string) {
  const profile = await getProfile();
  await requirePerm(profile.id, profile.role, "canCancel");

  const exitRecord = await prisma.stockExit.findUnique({ where: { id } });
  if (!exitRecord || exitRecord.status !== "draft") throw new Error("Seuls les brouillons peuvent être annulés");

  // Maker-checker
  if (profile.role !== "admin" && exitRecord.createdById === profile.id) {
    throw new Error("Vous ne pouvez pas annuler votre propre opération (principe de séparation des responsabilités)");
  }

  await prisma.stockExit.update({
    where: { id },
    data:  { status: "cancelled", validatedById: profile.id, validatedAt: new Date() },
  });

  revalidatePath("/fournitures/sorties");
  redirect("/fournitures/sorties");
}
