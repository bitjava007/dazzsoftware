"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/audit";
import { generateInvoiceNumber } from "@/lib/utils";
import { InvoiceStatus } from "@prisma/client";

export async function createConsolidatedInvoiceAction(data: {
  clientId: string;
  orderIds: string[];
  currencyId: string;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!data.orderIds.length) return { error: "Sélectionnez au moins une commande" };

  try {
    const orders = await prisma.order.findMany({
      where: { id: { in: data.orderIds }, deletedAt: null, clientId: data.clientId },
      include: {
        payments: { where: { deletedAt: null, paymentType: { notIn: ["remboursement", "remise"] } } },
      },
    });

    if (!orders.length) return { error: "Commandes introuvables" };

    const subtotal = orders.reduce((s, o) => s + Number(o.subtotal ?? o.sellingPrice), 0);
    const discount = orders.reduce((s, o) => s + Number(o.discount ?? 0), 0);
    const bonus = orders.reduce((s, o) => s + Number(o.bonus ?? 0), 0);
    const totalAmount = orders.reduce((s, o) => s + Number(o.sellingPrice), 0);
    const amountPaid = orders.reduce(
      (s, o) => s + o.payments.reduce((ps, p) => ps + Number(p.amountOriginal), 0),
      0,
    );
    const balanceDue = Math.max(0, totalAmount - amountPaid);

    const invoiceNumber = generateInvoiceNumber();

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          clientId: data.clientId,
          issueDate: new Date(),
          subtotal,
          discount,
          bonus,
          totalAmount,
          currencyId: data.currencyId,
          amountPaid,
          balanceDue,
          notes: data.notes || null,
          status: InvoiceStatus.draft,
          createdById: user.id,
          updatedById: user.id,
        },
      });

      await tx.invoiceItem.createMany({
        data: orders.map((o) => ({
          invoiceId: inv.id,
          orderId: o.id,
          amount: Number(o.sellingPrice),
        })),
      });

      return inv;
    });

    await createAuditLog({
      userId: user.id,
      tableName: "invoices",
      recordId: invoice.id,
      action: "create",
      newValues: { invoiceNumber, clientId: data.clientId, orderIds: data.orderIds, totalAmount },
    });

    revalidatePath("/factures");
    data.orderIds.forEach((id) => revalidatePath(`/commandes/${id}`));
    return { success: true, invoice };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la création de la facture" };
  }
}

export async function createInvoiceFromOrderAction(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId, deletedAt: null },
      include: {
        payments: { where: { deletedAt: null, paymentType: { notIn: ["remboursement", "remise"] } } },
      },
    });
    if (!order) return { error: "Commande introuvable" };

    // Check if already invoiced
    const existing = await prisma.invoiceItem.findFirst({
      where: { orderId, invoice: { deletedAt: null, status: { not: InvoiceStatus.cancelled } } },
      include: { invoice: { select: { id: true, invoiceNumber: true } } },
    });
    if (existing) return { success: true, invoice: existing.invoice, alreadyExists: true };

    return createConsolidatedInvoiceAction({
      clientId: order.clientId,
      orderIds: [orderId],
      currencyId: order.currencyId,
    });
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de la création de la facture" };
  }
}

export async function issueInvoiceAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  try {
    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.issued, updatedById: user.id },
    });
    revalidatePath("/factures");
    return { success: true, invoice };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de l'émission" };
  }
}

export async function cancelInvoiceAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  try {
    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.cancelled, updatedById: user.id },
    });
    revalidatePath("/factures");
    return { success: true, invoice };
  } catch (error) {
    console.error(error);
    return { error: "Erreur lors de l'annulation" };
  }
}

export async function getInvoices() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return prisma.invoice.findMany({
    where: { deletedAt: null },
    include: {
      client: { select: { id: true, fullName: true, phone: true, email: true } },
      order: { select: { orderNumber: true, currency: true } },
      items: {
        include: {
          order: {
            select: {
              orderNumber: true,
              sellingPrice: true,
              currency: true,
            },
          },
        },
      },
      currency: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEligibleOrders(clientId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return prisma.order.findMany({
    where: {
      deletedAt: null,
      currentStatus: { not: "annulee" },
      ...(clientId ? { clientId } : {}),
      invoiceItems: { none: {} },
      invoices: { none: { deletedAt: null, status: { not: InvoiceStatus.cancelled } } },
    },
    include: {
      client: { select: { id: true, fullName: true } },
      currency: { select: { id: true, code: true } },
      lines: { select: { lineTotal: true } },
    },
    orderBy: { orderDate: "desc" },
  });
}
