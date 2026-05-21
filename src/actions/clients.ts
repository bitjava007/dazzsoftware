"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/audit";

const clientSchema = z.object({
  fullName: z.string().min(2, "Le nom doit avoir au moins 2 caractères"),
  phone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function createClientAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const parsed = clientSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    country: formData.get("country") || undefined,
    city: formData.get("city") || undefined,
    address: formData.get("address") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const client = await prisma.client.create({
      data: {
        ...parsed.data,
        email: parsed.data.email || null,
        createdById: user.id,
        updatedById: user.id,
      },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "clients",
      recordId: client.id,
      action: "create",
      newValues: parsed.data,
    });

    revalidatePath("/clients");
    return { success: true, client };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la création du client" };
  }
}

export async function updateClientAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const parsed = clientSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    country: formData.get("country") || undefined,
    city: formData.get("city") || undefined,
    address: formData.get("address") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const old = await prisma.client.findUnique({ where: { id } });
    const client = await prisma.client.update({
      where: { id },
      data: { ...parsed.data, email: parsed.data.email || null, updatedById: user.id },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "clients",
      recordId: id,
      action: "update",
      oldValues: old as Record<string, unknown>,
      newValues: parsed.data,
    });

    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return { success: true, client };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la modification du client" };
  }
}

export async function deleteClientAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  try {
    await prisma.client.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: user.id },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "clients",
      recordId: id,
      action: "delete",
    });

    revalidatePath("/clients");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la suppression du client" };
  }
}

export async function getClients() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return prisma.client.findMany({
    where: { deletedAt: null },
    include: {
      _count: { select: { orders: true, measurements: true } },
      orders: {
        where: { deletedAt: null },
        include: {
          payments: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClientById(id: string) {
  return prisma.client.findUnique({
    where: { id, deletedAt: null },
    include: {
      measurements: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      orders: {
        where: { deletedAt: null },
        include: {
          currency: true,
          lines: { select: { lineTotal: true } },
          payments: { where: { deletedAt: null } },
          expenses: { where: { deletedAt: null } },
          invoices: { where: { deletedAt: null } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
