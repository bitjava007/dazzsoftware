"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateTransferRef } from "@/lib/utils";

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
    where: { userId_module: { userId, module: "fournitures_transferts" } },
    select: { [action]: true },
  });
  if (!(perm as Record<string, boolean> | null)?.[action]) throw new Error("Accès refusé");
}

export async function createStockTransfer(formData: FormData) {
  const profile = await getProfile();
  await requirePerm(profile.id, profile.role, "canCreate");

  const date           = new Date(formData.get("date") as string);
  const fromLocationId = formData.get("fromLocationId") as string;
  const toLocationId   = formData.get("toLocationId") as string;
  const comment        = (formData.get("comment") as string) || null;

  if (fromLocationId === toLocationId) throw new Error("Les emplacements source et destination doivent être différents");

  const linesRaw = formData.get("lines") as string;
  const lines: { supplyId: string; quantity: number }[] = JSON.parse(linesRaw || "[]");
  if (!lines.length) throw new Error("Au moins une fourniture requise");

  for (const line of lines) {
    const balance = await prisma.stockBalance.findUnique({
      where: { supplyId_locationId: { supplyId: line.supplyId, locationId: fromLocationId } },
    });
    const available = Number(balance?.quantity ?? 0);
    if (available < line.quantity) {
      const supply = await prisma.supply.findUnique({ where: { id: line.supplyId }, select: { name: true, unit: true } });
      throw new Error(`Stock insuffisant pour "${supply?.name}". Disponible : ${available} ${supply?.unit}`);
    }
  }

  const transfer = await prisma.stockTransfer.create({
    data: {
      reference: generateTransferRef(),
      date,
      fromLocationId,
      toLocationId,
      comment,
      createdById: profile.id,
      lines: { create: lines.map((l) => ({ supplyId: l.supplyId, quantity: l.quantity })) },
    },
  });

  revalidatePath("/fournitures");
  redirect(`/fournitures/transferts/${transfer.id}`);
}

export async function validateStockTransfer(id: string) {
  const profile = await getProfile();
  await requirePerm(profile.id, profile.role, "canValidate");

  const transfer = await prisma.stockTransfer.findUnique({ where: { id }, include: { lines: true } });
  if (!transfer) throw new Error("Transfert introuvable");
  if (transfer.status !== "draft" && transfer.status !== "shipped") throw new Error("Transfert déjà traité");

  // Maker-checker
  if (profile.role !== "admin" && transfer.createdById === profile.id) {
    throw new Error("Vous ne pouvez pas valider votre propre opération (principe de séparation des responsabilités)");
  }

  await prisma.$transaction(async (tx) => {
    for (const line of transfer.lines) {
      const balance = await tx.stockBalance.findUnique({
        where: { supplyId_locationId: { supplyId: line.supplyId, locationId: transfer.fromLocationId } },
      });
      const available = Number(balance?.quantity ?? 0);
      if (available < Number(line.quantity)) {
        const supply = await tx.supply.findUnique({ where: { id: line.supplyId }, select: { name: true, unit: true } });
        throw new Error(`Stock insuffisant pour "${supply?.name}". Disponible : ${available} ${supply?.unit}`);
      }

      await tx.stockBalance.update({
        where: { supplyId_locationId: { supplyId: line.supplyId, locationId: transfer.fromLocationId } },
        data:  { quantity: { decrement: line.quantity } },
      });

      await tx.stockBalance.upsert({
        where:  { supplyId_locationId: { supplyId: line.supplyId, locationId: transfer.toLocationId } },
        update: { quantity: { increment: line.quantity } },
        create: { supplyId: line.supplyId, locationId: transfer.toLocationId, quantity: line.quantity },
      });

      const supply = await tx.supply.findUnique({ where: { id: line.supplyId }, select: { unit: true } });
      await tx.stockMovement.create({
        data: {
          reference:      transfer.reference,
          type:           "transfer_out",
          supplyId:       line.supplyId,
          quantity:       line.quantity,
          unit:           supply!.unit,
          fromLocationId: transfer.fromLocationId,
          toLocationId:   transfer.toLocationId,
          createdById:    profile.id,
        },
      });
    }

    await tx.stockTransfer.update({
      where: { id },
      data:  { status: "received", validatedById: profile.id, validatedAt: new Date() },
    });
  });

  revalidatePath("/fournitures");
  redirect(`/fournitures/transferts/${id}`);
}

export async function cancelStockTransfer(id: string) {
  const profile = await getProfile();
  await requirePerm(profile.id, profile.role, "canCancel");

  const transfer = await prisma.stockTransfer.findUnique({ where: { id } });
  if (!transfer) throw new Error("Transfert introuvable");
  if (transfer.status !== "draft") throw new Error("Seuls les brouillons peuvent être annulés");

  // Maker-checker
  if (profile.role !== "admin" && transfer.createdById === profile.id) {
    throw new Error("Vous ne pouvez pas annuler votre propre opération (principe de séparation des responsabilités)");
  }

  await prisma.stockTransfer.update({
    where: { id },
    data:  { status: "cancelled", validatedById: profile.id, validatedAt: new Date() },
  });

  revalidatePath("/fournitures/transferts");
  redirect("/fournitures/transferts");
}
