"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/audit";
import { generateOrderNumber } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";

const orderSchema = z.object({
  clientId: z.string().min(1, "Sélectionnez un client"),
  articleId: z.string().optional(),
  measurementId: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  orderDetails: z.string().optional(),
  sellingPrice: z.coerce.number().positive("Le prix doit être positif"),
  currencyId: z.string().min(1, "Sélectionnez une devise"),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
});

export async function createOrderAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const parsed = orderSchema.safeParse({
    clientId: formData.get("clientId"),
    articleId: formData.get("articleId") || undefined,
    measurementId: formData.get("measurementId") || undefined,
    country: formData.get("country") || undefined,
    city: formData.get("city") || undefined,
    orderDetails: formData.get("orderDetails") || undefined,
    sellingPrice: formData.get("sellingPrice"),
    currencyId: formData.get("currencyId"),
    orderDate: formData.get("orderDate") || undefined,
    expectedDeliveryDate: formData.get("expectedDeliveryDate") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const orderNumber = generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        clientId: parsed.data.clientId,
        articleId: parsed.data.articleId || null,
        measurementId: parsed.data.measurementId || null,
        country: parsed.data.country || null,
        city: parsed.data.city || null,
        orderDetails: parsed.data.orderDetails || null,
        sellingPrice: parsed.data.sellingPrice,
        currencyId: parsed.data.currencyId,
        orderDate: parsed.data.orderDate ? new Date(parsed.data.orderDate) : new Date(),
        expectedDeliveryDate: parsed.data.expectedDeliveryDate
          ? new Date(parsed.data.expectedDeliveryDate)
          : null,
        currentStatus: OrderStatus.brouillon,
        createdById: user.id,
        updatedById: user.id,
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        newStatus: OrderStatus.brouillon,
        changedById: user.id,
        note: "Commande créée",
      },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "orders",
      recordId: order.id,
      action: "create",
      newValues: { orderNumber, ...parsed.data },
    });

    revalidatePath("/commandes");
    return { success: true, order };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la création de la commande" };
  }
}

export async function updateOrderStatusAction(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { error: "Commande introuvable" };

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        currentStatus: newStatus,
        updatedById: user.id,
        actualDeliveryDate:
          newStatus === OrderStatus.livree ? new Date() : undefined,
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        oldStatus: order.currentStatus,
        newStatus,
        note: note || null,
        changedById: user.id,
      },
    });

    revalidatePath("/commandes");
    revalidatePath(`/commandes/${orderId}`);
    return { success: true, order: updatedOrder };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors du changement de statut" };
  }
}

export async function getOrders() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return prisma.order.findMany({
    where: { deletedAt: null },
    include: {
      client: { select: { id: true, fullName: true, phone: true } },
      article: { select: { id: true, name: true } },
      currency: { select: { id: true, code: true, symbol: true } },
      payments: { where: { deletedAt: null }, select: { amountOriginal: true, paymentType: true } },
      expenses: { where: { deletedAt: null }, select: { amountOriginal: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id, deletedAt: null },
    include: {
      client: true,
      article: true,
      measurement: true,
      currency: true,
      statusHistory: {
        include: { changedBy: { select: { fullName: true } } },
        orderBy: { changedAt: "desc" },
      },
      payments: {
        where: { deletedAt: null },
        include: { currency: true },
        orderBy: { paymentDate: "desc" },
      },
      expenses: {
        where: { deletedAt: null },
        include: { category: true, currency: true },
        orderBy: { expenseDate: "desc" },
      },
      invoices: { where: { deletedAt: null } },
    },
  });
}

export async function deleteOrderAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  try {
    await prisma.order.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: user.id },
    });

    revalidatePath("/commandes");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la suppression" };
  }
}
