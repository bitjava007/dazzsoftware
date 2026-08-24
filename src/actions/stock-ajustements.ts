"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateAdjustmentRef } from "@/lib/utils";
import type { AdjustmentReason } from "@prisma/client";

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

export async function createAdjustment(formData: FormData) {
  const profile = await getUser();

  const date = new Date(formData.get("date") as string);
  const reason = formData.get("reason") as AdjustmentReason;
  const comment = (formData.get("comment") as string) || null;

  const linesRaw = formData.get("lines") as string;
  const lines: { supplyId: string; locationId: string; newQuantity: number }[] = JSON.parse(linesRaw || "[]");
  if (!lines.length) throw new Error("Au moins une ligne requise");

  await prisma.$transaction(async (tx) => {
    const adjLines = await Promise.all(
      lines.map(async (l) => {
        const balance = await tx.stockBalance.findUnique({
          where: { supplyId_locationId: { supplyId: l.supplyId, locationId: l.locationId } },
        });
        const qtyBefore = Number(balance?.quantity ?? 0);
        return {
          supplyId: l.supplyId,
          locationId: l.locationId,
          quantityBefore: qtyBefore,
          quantityAfter: l.newQuantity,
          quantityDelta: l.newQuantity - qtyBefore,
        };
      })
    );

    const ref = generateAdjustmentRef();

    await tx.stockAdjustment.create({
      data: {
        reference: ref,
        date,
        reason,
        comment,
        createdById: profile.id,
        lines: { create: adjLines },
      },
    });

    for (const adj of adjLines) {
      await tx.stockBalance.upsert({
        where: { supplyId_locationId: { supplyId: adj.supplyId, locationId: adj.locationId } },
        update: { quantity: adj.quantityAfter },
        create: { supplyId: adj.supplyId, locationId: adj.locationId, quantity: adj.quantityAfter },
      });

      const supply = await tx.supply.findUnique({ where: { id: adj.supplyId }, select: { unit: true } });
      await tx.stockMovement.create({
        data: {
          reference: ref,
          type: "adjustment",
          supplyId: adj.supplyId,
          quantity: Math.abs(adj.quantityDelta),
          unit: supply!.unit,
          fromLocationId: adj.quantityDelta < 0 ? adj.locationId : null,
          toLocationId: adj.quantityDelta > 0 ? adj.locationId : null,
          reason,
          comment,
          createdById: profile.id,
        },
      });
    }
  });

  revalidatePath("/fournitures");
  redirect("/fournitures/ajustements");
}
