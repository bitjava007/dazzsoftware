"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } });
  if (profile?.role !== "admin" && profile?.role !== "manager") throw new Error("Accès refusé");
  return user;
}

export async function createSupplier(formData: FormData) {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Nom requis");

  await prisma.supplier.create({
    data: {
      name,
      phone: (formData.get("phone") as string) || null,
      whatsappNumber: (formData.get("whatsappNumber") as string) || null,
      email: (formData.get("email") as string) || null,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      country: (formData.get("country") as string) || null,
      contactName: (formData.get("contactName") as string) || null,
      notes: (formData.get("notes") as string) || null,
    },
  });

  revalidatePath("/fournitures/fournisseurs");
  redirect("/fournitures/fournisseurs");
}

export async function updateSupplier(id: string, formData: FormData) {
  await requireAdmin();

  await prisma.supplier.update({
    where: { id },
    data: {
      name: (formData.get("name") as string)?.trim(),
      phone: (formData.get("phone") as string) || null,
      whatsappNumber: (formData.get("whatsappNumber") as string) || null,
      email: (formData.get("email") as string) || null,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      country: (formData.get("country") as string) || null,
      contactName: (formData.get("contactName") as string) || null,
      notes: (formData.get("notes") as string) || null,
      isActive: formData.get("isActive") === "true",
    },
  });

  revalidatePath("/fournitures/fournisseurs");
  redirect("/fournitures/fournisseurs");
}

export async function toggleSupplierActive(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.supplier.update({ where: { id }, data: { isActive } });
  revalidatePath("/fournitures/fournisseurs");
}
