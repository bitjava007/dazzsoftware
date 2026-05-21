"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/audit";

const articleSchema = z.object({
  name: z.string().min(2, "Le nom doit avoir au moins 2 caractères"),
  description: z.string().optional(),
  indicativePrice: z.coerce.number().positive().optional(),
});

export async function createArticleAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const parsed = articleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    indicativePrice: formData.get("indicativePrice") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const article = await prisma.article.create({
      data: {
        ...parsed.data,
        createdById: user.id,
        updatedById: user.id,
      },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "articles",
      recordId: article.id,
      action: "create",
      newValues: parsed.data,
    });

    revalidatePath("/articles");
    return { success: true, article };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la création" };
  }
}

export async function updateArticleAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const parsed = articleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    indicativePrice: formData.get("indicativePrice") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const article = await prisma.article.update({
      where: { id },
      data: { ...parsed.data, updatedById: user.id },
    });

    revalidatePath("/articles");
    return { success: true, article };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la modification" };
  }
}

export async function deleteArticleAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  try {
    await prisma.article.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: user.id },
    });

    revalidatePath("/articles");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la suppression" };
  }
}

export async function getArticles() {
  return prisma.article.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
}
