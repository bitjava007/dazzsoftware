"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/audit";

const rateSchema = z.object({
  fromCurrencyId: z.string().min(1, "Sélectionnez la devise source"),
  toCurrencyId: z.string().min(1, "Sélectionnez la devise cible"),
  rate: z.coerce.number().positive("Le taux doit être positif"),
  effectiveDate: z.string().min(1, "La date est obligatoire"),
  source: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function getExchangeRates() {
  return prisma.exchangeRate.findMany({
    where: { deletedAt: null },
    include: { fromCurrency: true, toCurrency: true },
    orderBy: { effectiveDate: "desc" },
  });
}

export async function getActiveCurrencies() {
  return prisma.currency.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });
}

export async function getLatestRate(fromCode: string, toCode: string) {
  const rate = await prisma.exchangeRate.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
      fromCurrency: { code: fromCode },
      toCurrency: { code: toCode },
    },
    orderBy: { effectiveDate: "desc" },
  });
  return rate ? Number(rate.rate) : null;
}

export async function createExchangeRateAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const parsed = rateSchema.safeParse({
    fromCurrencyId: formData.get("fromCurrencyId"),
    toCurrencyId: formData.get("toCurrencyId"),
    rate: formData.get("rate"),
    effectiveDate: formData.get("effectiveDate"),
    source: formData.get("source") || undefined,
    notes: formData.get("notes") || undefined,
    isActive: formData.get("isActive") !== "false",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.fromCurrencyId === parsed.data.toCurrencyId)
    return { error: "Les deux devises doivent être différentes" };

  try {
    // Deactivate previous rates for same pair
    await prisma.exchangeRate.updateMany({
      where: {
        fromCurrencyId: parsed.data.fromCurrencyId,
        toCurrencyId: parsed.data.toCurrencyId,
        isActive: true,
        deletedAt: null,
      },
      data: { isActive: false },
    });

    const exchangeRate = await prisma.exchangeRate.create({
      data: {
        fromCurrencyId: parsed.data.fromCurrencyId,
        toCurrencyId: parsed.data.toCurrencyId,
        rate: parsed.data.rate,
        effectiveDate: new Date(parsed.data.effectiveDate),
        source: parsed.data.source || null,
        notes: parsed.data.notes || null,
        isActive: parsed.data.isActive,
        createdById: user.id,
        updatedById: user.id,
      },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "exchange_rates",
      recordId: exchangeRate.id,
      action: "create",
      newValues: parsed.data as Record<string, unknown>,
    });

    revalidatePath("/parametres");
    revalidatePath("/dashboard");
    return { success: true, exchangeRate };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la création du taux" };
  }
}

export async function updateExchangeRateAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const parsed = rateSchema.safeParse({
    fromCurrencyId: formData.get("fromCurrencyId"),
    toCurrencyId: formData.get("toCurrencyId"),
    rate: formData.get("rate"),
    effectiveDate: formData.get("effectiveDate"),
    source: formData.get("source") || undefined,
    notes: formData.get("notes") || undefined,
    isActive: formData.get("isActive") !== "false",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const exchangeRate = await prisma.exchangeRate.update({
      where: { id },
      data: {
        rate: parsed.data.rate,
        effectiveDate: new Date(parsed.data.effectiveDate),
        source: parsed.data.source || null,
        notes: parsed.data.notes || null,
        isActive: parsed.data.isActive,
        updatedById: user.id,
      },
    });

    revalidatePath("/parametres");
    revalidatePath("/dashboard");
    return { success: true, exchangeRate };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la modification" };
  }
}

export async function deleteExchangeRateAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  try {
    await prisma.exchangeRate.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: user.id },
    });
    revalidatePath("/parametres");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la suppression" };
  }
}
