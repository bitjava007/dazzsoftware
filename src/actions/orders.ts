"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/audit";
import { generateOrderNumber } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";

const orderLineSchema = z.object({
  articleId: z.string().optional(),
  description: z.string().optional(),
  quantity: z.coerce.number().int().positive().default(1),
  unitPrice: z.coerce.number().positive("Le prix unitaire doit être positif"),
});

const orderSchema = z.object({
  clientId: z.string().min(1, "Sélectionnez un client"),
  measurementId: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  orderDetails: z.string().optional(),
  notes: z.string().optional(),
  currencyId: z.string().min(1, "Sélectionnez une devise"),
  discount: z.coerce.number().min(0).default(0),
  bonus: z.coerce.number().min(0).default(0),
  orderDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  lines: z.array(orderLineSchema).min(1, "Ajoutez au moins une ligne"),
});

export async function createOrderAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  let linesRaw: unknown[];
  try {
    linesRaw = JSON.parse(formData.get("lines") as string || "[]");
  } catch {
    linesRaw = [];
  }

  const parsed = orderSchema.safeParse({
    clientId: formData.get("clientId"),
    measurementId: formData.get("measurementId") || undefined,
    country: formData.get("country") || undefined,
    city: formData.get("city") || undefined,
    orderDetails: formData.get("orderDetails") || undefined,
    notes: formData.get("notes") || undefined,
    currencyId: formData.get("currencyId"),
    discount: formData.get("discount") || 0,
    bonus: formData.get("bonus") || 0,
    orderDate: formData.get("orderDate") || undefined,
    expectedDeliveryDate: formData.get("expectedDeliveryDate") || undefined,
    lines: linesRaw,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const subtotal = parsed.data.lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPrice,
    0
  );
  const sellingPrice = Math.max(0, subtotal - parsed.data.discount - parsed.data.bonus);
  const orderNumber = generateOrderNumber();

  try {
    const order = await prisma.order.create({
      data: {
        orderNumber,
        clientId: parsed.data.clientId,
        measurementId: parsed.data.measurementId || null,
        country: parsed.data.country || null,
        city: parsed.data.city || null,
        orderDetails: parsed.data.orderDetails || null,
        notes: parsed.data.notes || null,
        subtotal,
        discount: parsed.data.discount,
        bonus: parsed.data.bonus,
        sellingPrice,
        currencyId: parsed.data.currencyId,
        orderDate: parsed.data.orderDate ? new Date(parsed.data.orderDate) : new Date(),
        expectedDeliveryDate: parsed.data.expectedDeliveryDate
          ? new Date(parsed.data.expectedDeliveryDate)
          : null,
        currentStatus: OrderStatus.brouillon,
        createdById: user.id,
        updatedById: user.id,
        lines: {
          create: parsed.data.lines.map((l) => ({
            articleId: l.articleId || null,
            description: l.description || null,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.quantity * l.unitPrice,
          })),
        },
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
      newValues: { orderNumber, subtotal, sellingPrice },
    });

    revalidatePath("/commandes");
    return { success: true, order };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la création de la commande" };
  }
}

export async function updateOrderAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  let linesRaw: unknown[];
  try {
    linesRaw = JSON.parse(formData.get("lines") as string || "[]");
  } catch {
    linesRaw = [];
  }

  const parsed = orderSchema.safeParse({
    clientId: formData.get("clientId"),
    measurementId: formData.get("measurementId") || undefined,
    country: formData.get("country") || undefined,
    city: formData.get("city") || undefined,
    orderDetails: formData.get("orderDetails") || undefined,
    notes: formData.get("notes") || undefined,
    currencyId: formData.get("currencyId"),
    discount: formData.get("discount") || 0,
    bonus: formData.get("bonus") || 0,
    orderDate: formData.get("orderDate") || undefined,
    expectedDeliveryDate: formData.get("expectedDeliveryDate") || undefined,
    lines: linesRaw,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const subtotal = parsed.data.lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPrice,
    0
  );
  const sellingPrice = Math.max(0, subtotal - parsed.data.discount - parsed.data.bonus);

  try {
    // Delete existing lines, then recreate
    await prisma.orderLine.deleteMany({ where: { orderId: id } });

    const order = await prisma.order.update({
      where: { id },
      data: {
        clientId: parsed.data.clientId,
        measurementId: parsed.data.measurementId || null,
        country: parsed.data.country || null,
        city: parsed.data.city || null,
        orderDetails: parsed.data.orderDetails || null,
        notes: parsed.data.notes || null,
        subtotal,
        discount: parsed.data.discount,
        bonus: parsed.data.bonus,
        sellingPrice,
        currencyId: parsed.data.currencyId,
        orderDate: parsed.data.orderDate ? new Date(parsed.data.orderDate) : undefined,
        expectedDeliveryDate: parsed.data.expectedDeliveryDate
          ? new Date(parsed.data.expectedDeliveryDate)
          : null,
        updatedById: user.id,
        lines: {
          create: parsed.data.lines.map((l) => ({
            articleId: l.articleId || null,
            description: l.description || null,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.quantity * l.unitPrice,
          })),
        },
      },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "orders",
      recordId: id,
      action: "update",
      newValues: { subtotal, sellingPrice },
    });

    revalidatePath("/commandes");
    revalidatePath(`/commandes/${id}`);
    return { success: true, order };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la modification" };
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
        actualDeliveryDate: newStatus === OrderStatus.livree ? new Date() : undefined,
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

export async function duplicateOrderAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  try {
    const original = await prisma.order.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!original) return { error: "Commande introuvable" };

    const orderNumber = generateOrderNumber();
    const order = await prisma.order.create({
      data: {
        orderNumber,
        clientId: original.clientId,
        measurementId: original.measurementId,
        country: original.country,
        city: original.city,
        orderDetails: original.orderDetails,
        notes: original.notes,
        subtotal: original.subtotal,
        discount: original.discount,
        bonus: original.bonus,
        sellingPrice: original.sellingPrice,
        currencyId: original.currencyId,
        orderDate: new Date(),
        expectedDeliveryDate: original.expectedDeliveryDate,
        currentStatus: OrderStatus.brouillon,
        createdById: user.id,
        updatedById: user.id,
        lines: {
          create: original.lines.map((l) => ({
            articleId: l.articleId,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
          })),
        },
      },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        newStatus: OrderStatus.brouillon,
        changedById: user.id,
        note: `Dupliqué depuis ${original.orderNumber}`,
      },
    });

    revalidatePath("/commandes");
    return { success: true, order };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la duplication" };
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
      currency: { select: { id: true, code: true, symbol: true } },
      payments: { where: { deletedAt: null }, select: { amountOriginal: true, paymentType: true } },
      lines: { select: { quantity: true, unitPrice: true, lineTotal: true, article: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id, deletedAt: null },
    include: {
      client: true,
      measurement: true,
      currency: true,
      lines: {
        include: { article: { include: { articleType: true } } },
        orderBy: { createdAt: "asc" },
      },
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
      data: { deletedAt: new Date(), deletedById: user.id, currentStatus: OrderStatus.annulee },
    });
    revalidatePath("/commandes");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la suppression" };
  }
}
