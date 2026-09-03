"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/audit";
import { generateExpenseNumber } from "@/lib/utils";

const expenseSchema = z.object({
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  orderId: z.string().optional(),
  linkedToOrder: z.boolean().default(false),
  expenseDate: z.string().min(1, "La date est obligatoire"),
  beneficiary: z.string().optional(),
  paymentType: z.enum(["cash", "mobile_money", "bank_transfer", "card"]),
  amountOriginal: z.coerce.number().positive("Le montant doit être positif"),
  currencyId: z.string().min(1, "Sélectionnez une devise"),
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
    where: { userId_module: { userId, module: "depenses" } },
    select: { [action]: true },
  });
  return !!(perm as Record<string, boolean> | null)?.[action];
}

export async function createExpenseAction(formData: FormData) {
  const profile = await getAuthProfile();
  if (!profile) return { error: "Non authentifié" };

  const hasCreate = await checkPerm(profile.id, profile.role, "canCreate");
  if (!hasCreate) return { error: "Permission insuffisante pour créer une dépense" };

  const linkedToOrderRaw = formData.get("linkedToOrder");
  const parsed = expenseSchema.safeParse({
    categoryId: formData.get("categoryId") || undefined,
    subcategoryId: formData.get("subcategoryId") || undefined,
    orderId: formData.get("orderId") || undefined,
    linkedToOrder: linkedToOrderRaw === "true" || linkedToOrderRaw === "on",
    expenseDate: formData.get("expenseDate"),
    beneficiary: formData.get("beneficiary") || undefined,
    paymentType: formData.get("paymentType"),
    amountOriginal: formData.get("amountOriginal"),
    currencyId: formData.get("currencyId"),
    label: formData.get("label") || undefined,
    details: formData.get("details") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const expenseNumber = generateExpenseNumber();
    // Admin auto-validates their own expense; others create as pending
    const isAdmin = profile.role === "admin";

    const expense = await prisma.expense.create({
      data: {
        expenseNumber,
        categoryId: parsed.data.categoryId || null,
        subcategoryId: parsed.data.subcategoryId || null,
        orderId: parsed.data.orderId || null,
        linkedToOrder: parsed.data.linkedToOrder,
        expenseDate: new Date(parsed.data.expenseDate),
        beneficiary: parsed.data.beneficiary || null,
        paymentType: parsed.data.paymentType,
        amountOriginal: parsed.data.amountOriginal,
        currencyId: parsed.data.currencyId,
        label: parsed.data.label || null,
        details: parsed.data.details || null,
        createdById: profile.id,
        updatedById: profile.id,
        validationStatus: isAdmin ? "validated" : "pending_validation",
        validatedById:   isAdmin ? profile.id        : null,
        validatedByName: isAdmin ? profile.fullName  : null,
        validatedAt:     isAdmin ? new Date()        : null,
      },
    });

    await createAuditLog({
      userId: profile.id,
      tableName: "expenses",
      recordId: expense.id,
      action: "create",
      newValues: { expenseNumber, ...parsed.data },
    });

    revalidatePath("/depenses");
    if (parsed.data.orderId) revalidatePath(`/commandes/${parsed.data.orderId}`);
    return { success: true, expense };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la création de la dépense" };
  }
}

export async function validateExpenseAction(id: string) {
  const profile = await getAuthProfile();
  if (!profile) return { error: "Non authentifié" };

  const hasValidate = await checkPerm(profile.id, profile.role, "canValidate");
  if (!hasValidate) return { error: "Permission insuffisante pour valider une dépense" };

  const expense = await prisma.expense.findUnique({ where: { id }, select: { id: true, createdById: true, validationStatus: true } });
  if (!expense) return { error: "Dépense introuvable" };
  if (expense.validationStatus !== "pending_validation") return { error: "Cette dépense n'est pas en attente de validation" };

  // Maker-checker: non-admin cannot validate their own expense
  if (profile.role !== "admin" && expense.createdById === profile.id) {
    return { error: "Vous ne pouvez pas valider votre propre dépense (principe de séparation des responsabilités)" };
  }

  await prisma.expense.update({
    where: { id },
    data: {
      validationStatus: "validated",
      validatedById:   profile.id,
      validatedByName: profile.fullName,
      validatedAt:     new Date(),
      updatedById:     profile.id,
    },
  });

  revalidatePath("/depenses");
  return { success: true };
}

export async function cancelExpenseAction(id: string) {
  const profile = await getAuthProfile();
  if (!profile) return { error: "Non authentifié" };

  const hasCancel = await checkPerm(profile.id, profile.role, "canCancel");
  if (!hasCancel) return { error: "Permission insuffisante pour annuler une dépense" };

  const expense = await prisma.expense.findUnique({ where: { id }, select: { id: true, createdById: true, validationStatus: true } });
  if (!expense) return { error: "Dépense introuvable" };
  if (expense.validationStatus !== "pending_validation") return { error: "Seules les dépenses en attente peuvent être annulées" };

  // Maker-checker
  if (profile.role !== "admin" && expense.createdById === profile.id) {
    return { error: "Vous ne pouvez pas annuler votre propre dépense (principe de séparation des responsabilités)" };
  }

  await prisma.expense.update({
    where: { id },
    data: {
      validationStatus: "cancelled",
      validatedById:   profile.id,
      validatedByName: profile.fullName,
      validatedAt:     new Date(),
      updatedById:     profile.id,
    },
  });

  revalidatePath("/depenses");
  return { success: true };
}

export async function deleteExpenseAction(id: string) {
  const profile = await getAuthProfile();
  if (!profile) return { error: "Non authentifié" };

  const hasDelete = await checkPerm(profile.id, profile.role, "canDelete");
  if (!hasDelete) return { error: "Permission insuffisante pour supprimer une dépense" };

  try {
    await prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: profile.id },
    });
    revalidatePath("/depenses");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la suppression" };
  }
}

export async function getExpenses() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return prisma.expense.findMany({
    where: { deletedAt: null },
    include: {
      category: true,
      subcategory: true,
      order: { select: { orderNumber: true, client: { select: { fullName: true } } } },
      currency: true,
    },
    orderBy: { expenseDate: "desc" },
  });
}

export async function getExpenseCategories() {
  return prisma.expenseCategory.findMany({
    include: { subcategories: true },
    orderBy: { name: "asc" },
  });
}
