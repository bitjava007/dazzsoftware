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

async function getAuthProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true, fullName: true },
  });
  return profile ? { ...profile, userId: user.id } : null;
}

async function checkPerm(userId: string, role: string, action: "canCreate" | "canValidate" | "canCancel" | "canDelete") {
  if (role === "admin") return true;
  const perm = await prisma.userModulePermission.findUnique({
    where: { userId_module: { userId, module: "paiements" } },
    select: { [action]: true },
  });
  return !!(perm as Record<string, boolean> | null)?.[action];
}

export async function createPaymentAction(formData: FormData) {
  const profile = await getAuthProfile();
  if (!profile) return { error: "Non authentifié" };

  const hasCreate = await checkPerm(profile.id, profile.role, "canCreate");
  if (!hasCreate) return { error: "Permission insuffisante pour créer un paiement" };

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
    const isAdmin = profile.role === "admin";

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
        createdById: profile.id,
        updatedById: profile.id,
        validationStatus: isAdmin ? "validated" : "pending_validation",
        validatedById:   isAdmin ? profile.id       : null,
        validatedByName: isAdmin ? profile.fullName : null,
        validatedAt:     isAdmin ? new Date()       : null,
      },
    });

    await createAuditLog({
      userId: profile.id,
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

export async function validatePaymentAction(id: string) {
  const profile = await getAuthProfile();
  if (!profile) return { error: "Non authentifié" };

  const hasValidate = await checkPerm(profile.id, profile.role, "canValidate");
  if (!hasValidate) return { error: "Permission insuffisante pour valider un paiement" };

  const payment = await prisma.orderPayment.findUnique({
    where: { id },
    select: { id: true, createdById: true, validationStatus: true, orderId: true },
  });
  if (!payment) return { error: "Paiement introuvable" };
  if (payment.validationStatus !== "pending_validation") return { error: "Ce paiement n'est pas en attente de validation" };

  if (profile.role !== "admin" && payment.createdById === profile.id) {
    return { error: "Vous ne pouvez pas valider votre propre paiement (principe de séparation des responsabilités)" };
  }

  await prisma.orderPayment.update({
    where: { id },
    data: {
      validationStatus: "validated",
      validatedById:   profile.id,
      validatedByName: profile.fullName,
      validatedAt:     new Date(),
      updatedById:     profile.id,
    },
  });

  revalidatePath("/paiements");
  if (payment.orderId) revalidatePath(`/commandes/${payment.orderId}`);
  return { success: true };
}

export async function cancelPaymentAction(id: string) {
  const profile = await getAuthProfile();
  if (!profile) return { error: "Non authentifié" };

  const hasCancel = await checkPerm(profile.id, profile.role, "canCancel");
  if (!hasCancel) return { error: "Permission insuffisante pour annuler un paiement" };

  const payment = await prisma.orderPayment.findUnique({
    where: { id },
    select: { id: true, createdById: true, validationStatus: true, orderId: true },
  });
  if (!payment) return { error: "Paiement introuvable" };
  if (payment.validationStatus !== "pending_validation") return { error: "Seuls les paiements en attente peuvent être annulés" };

  if (profile.role !== "admin" && payment.createdById === profile.id) {
    return { error: "Vous ne pouvez pas annuler votre propre paiement (principe de séparation des responsabilités)" };
  }

  await prisma.orderPayment.update({
    where: { id },
    data: {
      validationStatus: "cancelled",
      validatedById:   profile.id,
      validatedByName: profile.fullName,
      validatedAt:     new Date(),
      updatedById:     profile.id,
    },
  });

  revalidatePath("/paiements");
  if (payment.orderId) revalidatePath(`/commandes/${payment.orderId}`);
  return { success: true };
}

export async function updatePaymentAction(id: string, formData: FormData) {
  const profile = await getAuthProfile();
  if (!profile) return { error: "Non authentifié" };

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
        updatedById: profile.id,
      },
    });

    await createAuditLog({
      userId: profile.id,
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
  const profile = await getAuthProfile();
  if (!profile) return { error: "Non authentifié" };

  const hasDelete = await checkPerm(profile.id, profile.role, "canDelete");
  if (!hasDelete) return { error: "Permission insuffisante pour supprimer un paiement" };

  try {
    await prisma.orderPayment.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: profile.id },
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
