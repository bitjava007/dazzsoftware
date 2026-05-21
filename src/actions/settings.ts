"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function getSettings() {
  return prisma.settings.findFirst({
    include: { defaultCurrency: true },
  });
}

export async function upsertSettingsAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const data = {
    companyName: String(formData.get("companyName") || "Dazzling Tailor"),
    address: String(formData.get("address") || "") || null,
    phone: String(formData.get("phone") || "") || null,
    email: String(formData.get("email") || "") || null,
    taxNumber: String(formData.get("taxNumber") || "") || null,
    defaultCurrencyId: String(formData.get("defaultCurrencyId") || "") || null,
    invoicePrefix: String(formData.get("invoicePrefix") || "FACT-"),
    receiptPrefix: String(formData.get("receiptPrefix") || "RECU-"),
  };

  try {
    const existing = await prisma.settings.findFirst();
    if (existing) {
      await prisma.settings.update({ where: { id: existing.id }, data });
    } else {
      await prisma.settings.create({ data });
    }
    revalidatePath("/parametres");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la sauvegarde" };
  }
}
