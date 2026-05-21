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

export async function createExpenseAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

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

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const expenseNumber = generateExpenseNumber();

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
        createdById: user.id,
        updatedById: user.id,
      },
    });

    await createAuditLog({
      userId: user.id,
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

export async function deleteExpenseAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  try {
    await prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: user.id },
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
