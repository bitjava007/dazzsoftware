"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/audit";
import { generatePaymentNumber, generateReceiptNumber } from "@/lib/utils";

const paymentSchema = z.object({
  orderId: z.string().min(1, "Sélectionnez une commande"),
  paymentType: z.enum(["acompte_initial", "acompte", "paiement_final", "remboursement", "bonus", "remise"]),
  amountOriginal: z.coerce.number().positive("Le montant doit être positif"),
  currencyId: z.string().min(1, "Sélectionnez une devise"),
  paymentDate: z.string().min(1, "La date est obligatoire"),
  paymentMethod: z.enum(["cash", "mobile_money", "bank_transfer", "card", "wave", "orange_money"]),
  paymentReference: z.string().optional(),
  label: z.string().optional(),
  details: z.string().optional(),
});

export async function createPaymentAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const parsed = paymentSchema.safeParse({
    orderId: formData.get("orderId"),
    paymentType: formData.get("paymentType"),
    amountOriginal: formData.get("amountOriginal"),
    currencyId: formData.get("currencyId"),
    paymentDate: formData.get("paymentDate"),
    paymentMethod: formData.get("paymentMethod"),
    paymentReference: formData.get("paymentReference") || undefined,
    label: formData.get("label") || undefined,
    details: formData.get("details") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const paymentNumber = generatePaymentNumber();
    const receiptNumber = generateReceiptNumber();

    const payment = await prisma.orderPayment.create({
      data: {
        paymentNumber,
        receiptNumber,
        orderId: parsed.data.orderId,
        paymentType: parsed.data.paymentType,
        amountOriginal: parsed.data.amountOriginal,
        currencyId: parsed.data.currencyId,
        paymentDate: new Date(parsed.data.paymentDate),
        paymentMethod: parsed.data.paymentMethod,
        paymentReference: parsed.data.paymentReference || null,
        label: parsed.data.label || null,
        details: parsed.data.details || null,
        createdById: user.id,
        updatedById: user.id,
      },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "order_payments",
      recordId: payment.id,
      action: "create",
      newValues: { paymentNumber, receiptNumber, ...parsed.data } as Record<string, unknown>,
    });

    revalidatePath("/paiements");
    revalidatePath(`/commandes/${parsed.data.orderId}`);
    return { success: true, payment };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de l'enregistrement du paiement" };
  }
}

export async function updatePaymentAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const parsed = paymentSchema.safeParse({
    orderId: formData.get("orderId"),
    paymentType: formData.get("paymentType"),
    amountOriginal: formData.get("amountOriginal"),
    currencyId: formData.get("currencyId"),
    paymentDate: formData.get("paymentDate"),
    paymentMethod: formData.get("paymentMethod"),
    paymentReference: formData.get("paymentReference") || undefined,
    label: formData.get("label") || undefined,
    details: formData.get("details") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const old = await prisma.orderPayment.findUnique({ where: { id } });
    const payment = await prisma.orderPayment.update({
      where: { id },
      data: {
        paymentType: parsed.data.paymentType,
        amountOriginal: parsed.data.amountOriginal,
        currencyId: parsed.data.currencyId,
        paymentDate: new Date(parsed.data.paymentDate),
        paymentMethod: parsed.data.paymentMethod,
        paymentReference: parsed.data.paymentReference || null,
        label: parsed.data.label || null,
        details: parsed.data.details || null,
        updatedById: user.id,
      },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "order_payments",
      recordId: id,
      action: "update",
      oldValues: old as Record<string, unknown>,
      newValues: parsed.data as Record<string, unknown>,
    });

    revalidatePath("/paiements");
    revalidatePath(`/commandes/${parsed.data.orderId}`);
    return { success: true, payment };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la modification du paiement" };
  }
}

export async function deletePaymentAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  try {
    await prisma.orderPayment.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: user.id },
    });
    revalidatePath("/paiements");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la suppression" };
  }
}

export async function getPayments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return prisma.orderPayment.findMany({
    where: { deletedAt: null },
    include: {
      order: {
        select: {
          orderNumber: true,
          client: { select: { fullName: true } },
        },
      },
      currency: true,
    },
    orderBy: { paymentDate: "desc" },
  });
}
