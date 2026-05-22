"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const LOGO_BUCKET = "company-assets";
const LOGO_PATH = "logo";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
    whatsappEnabled: formData.get("whatsappEnabled") === "true",
    whatsappApiKey: String(formData.get("whatsappApiKey") || "") || null,
    whatsappPhoneNumberId: String(formData.get("whatsappPhoneNumberId") || "") || null,
    whatsappBusinessAccountId: String(formData.get("whatsappBusinessAccountId") || "") || null,
    companySenderName: String(formData.get("companySenderName") || "") || null,
    smsEnabled: formData.get("smsEnabled") === "true",
    smsProvider: String(formData.get("smsProvider") || "") || null,
    smsApiKey: String(formData.get("smsApiKey") || "") || null,
    emailEnabled: formData.get("emailEnabled") === "true",
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

export async function uploadLogoAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const file = formData.get("logo") as File | null;
  if (!file || file.size === 0) return { error: "Aucun fichier sélectionné" };

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Format non supporté. Utilisez JPEG, PNG, WebP ou SVG." };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { error: "Le logo ne doit pas dépasser 2 Mo." };
  }

  try {
    const admin = getAdminClient();

    // Ensure bucket exists (public)
    const { data: buckets } = await admin.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === LOGO_BUCKET);
    if (!bucketExists) {
      await admin.storage.createBucket(LOGO_BUCKET, { public: true });
    }

    const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
    const fileName = `${LOGO_PATH}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(LOGO_BUCKET)
      .upload(fileName, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { error: "Erreur lors de l'upload du logo" };
    }

    const { data: { publicUrl } } = admin.storage.from(LOGO_BUCKET).getPublicUrl(fileName);
    // Cache-bust so CDN serves the new image
    const logoUrl = `${publicUrl}?t=${Date.now()}`;

    const existing = await prisma.settings.findFirst();
    if (existing) {
      await prisma.settings.update({ where: { id: existing.id }, data: { logo: logoUrl } });
    } else {
      await prisma.settings.create({ data: { logo: logoUrl, companyName: "Dazzling Tailor" } });
    }

    revalidatePath("/parametres");
    revalidatePath("/dashboard");
    return { success: true, url: logoUrl };
  } catch (error) {
    console.error("Logo upload error:", error);
    return { error: "Erreur lors de l'upload" };
  }
}

export async function deleteLogoAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  try {
    const admin = getAdminClient();
    await Promise.allSettled([
      admin.storage.from(LOGO_BUCKET).remove([`${LOGO_PATH}.png`]),
      admin.storage.from(LOGO_BUCKET).remove([`${LOGO_PATH}.jpg`]),
      admin.storage.from(LOGO_BUCKET).remove([`${LOGO_PATH}.jpeg`]),
      admin.storage.from(LOGO_BUCKET).remove([`${LOGO_PATH}.webp`]),
      admin.storage.from(LOGO_BUCKET).remove([`${LOGO_PATH}.svg`]),
    ]);

    const existing = await prisma.settings.findFirst();
    if (existing) {
      await prisma.settings.update({ where: { id: existing.id }, data: { logo: null } });
    }

    revalidatePath("/parametres");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la suppression" };
  }
}
