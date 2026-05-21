"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/audit";

const articleSchema = z.object({
  name: z.string().min(2, "Le nom doit avoir au moins 2 caractères"),
  description: z.string().optional(),
  articleTypeId: z.string().optional(),
  indicativePrice: z.coerce.number().positive().optional(),
  isActive: z.boolean().default(true),
});

const articleTypeSchema = z.object({
  name: z.string().min(2, "Le nom doit avoir au moins 2 caractères"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function createArticleAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const parsed = articleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    articleTypeId: formData.get("articleTypeId") || undefined,
    indicativePrice: formData.get("indicativePrice") || undefined,
    isActive: formData.get("isActive") !== "false",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const article = await prisma.article.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        articleTypeId: parsed.data.articleTypeId || null,
        indicativePrice: parsed.data.indicativePrice ?? null,
        isActive: parsed.data.isActive,
        createdById: user.id,
        updatedById: user.id,
      },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "articles",
      recordId: article.id,
      action: "create",
      newValues: parsed.data as Record<string, unknown>,
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
    articleTypeId: formData.get("articleTypeId") || undefined,
    indicativePrice: formData.get("indicativePrice") || undefined,
    isActive: formData.get("isActive") !== "false",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const article = await prisma.article.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        articleTypeId: parsed.data.articleTypeId || null,
        indicativePrice: parsed.data.indicativePrice ?? null,
        isActive: parsed.data.isActive,
        updatedById: user.id,
      },
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
    include: { articleType: true },
    orderBy: { name: "asc" },
  });
}

// ─── Article Types ────────────────────────────────────────────────────────────

export async function getArticleTypes() {
  return prisma.articleType.findMany({ orderBy: { name: "asc" } });
}

export async function createArticleTypeAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const parsed = articleTypeSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    isActive: formData.get("isActive") !== "false",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const type = await prisma.articleType.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        isActive: parsed.data.isActive,
        createdById: user.id,
        updatedById: user.id,
      },
    });
    revalidatePath("/articles");
    return { success: true, type };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la création du type" };
  }
}

export async function updateArticleTypeAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const parsed = articleTypeSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    isActive: formData.get("isActive") !== "false",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const type = await prisma.articleType.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        isActive: parsed.data.isActive,
        updatedById: user.id,
      },
    });
    revalidatePath("/articles");
    return { success: true, type };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la modification du type" };
  }
}

export async function deleteArticleTypeAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  try {
    await prisma.articleType.delete({ where: { id } });
    revalidatePath("/articles");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la suppression du type" };
  }
}
