"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateTransferRef } from "@/lib/utils";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true, id: true } });
  if (!profile) throw new Error("Profil introuvable");
  if (profile.role !== "admin" && profile.role !== "manager") {
    const perm = await prisma.userModulePermission.findUnique({
      where: { userId_module: { userId: user.id, module: "fournitures" } },
    });
    if (!perm?.canCreate) throw new Error("Accès refusé");
  }
  return profile;
}

export async function createStockTransfer(formData: FormData) {
  const profile = await getUser();

  const date = new Date(formData.get("date") as string);
  const fromLocationId = formData.get("fromLocationId") as string;
  const toLocationId = formData.get("toLocationId") as string;
  const comment = (formData.get("comment") as string) || null;

  if (fromLocationId === toLocationId) throw new Error("Les emplacements source et destination doivent être différents");

  const linesRaw = formData.get("lines") as string;
  const lines: { supplyId: string; quantity: number }[] = JSON.parse(linesRaw || "[]");
  if (!lines.length) throw new Error("Au moins une fourniture requise");

  // Check stock
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
  const profile = await getUser();

  const transfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!transfer) throw new Error("Transfert introuvable");
  if (transfer.status !== "draft" && transfer.status !== "shipped") throw new Error("Transfert déjà traité");

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

      // Decrease source
      await tx.stockBalance.update({
        where: { supplyId_locationId: { supplyId: line.supplyId, locationId: transfer.fromLocationId } },
        data: { quantity: { decrement: line.quantity } },
      });

      // Increase destination
      await tx.stockBalance.upsert({
        where: { supplyId_locationId: { supplyId: line.supplyId, locationId: transfer.toLocationId } },
        update: { quantity: { increment: line.quantity } },
        create: { supplyId: line.supplyId, locationId: transfer.toLocationId, quantity: line.quantity },
      });

      const supply = await tx.supply.findUnique({ where: { id: line.supplyId }, select: { unit: true } });
      await tx.stockMovement.create({
        data: {
          reference: transfer.reference,
          type: "transfer_out",
          supplyId: line.supplyId,
          quantity: line.quantity,
          unit: supply!.unit,
          fromLocationId: transfer.fromLocationId,
          toLocationId: transfer.toLocationId,
          createdById: profile.id,
        },
      });
    }

    await tx.stockTransfer.update({
      where: { id },
      data: { status: "received", validatedById: profile.id, validatedAt: new Date() },
    });
  });

  revalidatePath("/fournitures");
  redirect(`/fournitures/transferts/${id}`);
}
