"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/audit";
import { generateInvoiceNumber } from "@/lib/utils";
import { InvoiceStatus } from "@prisma/client";

export async function createInvoiceAction(orderId: string) {
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

    const amountPaid = order.payments.reduce(
      (sum, p) => sum + Number(p.amountOriginal),
      0
    );
    const totalAmount = Number(order.sellingPrice);
    const balanceDue = totalAmount - amountPaid;

    const invoiceNumber = generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId,
        issueDate: new Date(),
        totalAmount,
        currencyId: order.currencyId,
        amountPaid,
        balanceDue,
        status: InvoiceStatus.draft,
        createdById: user.id,
        updatedById: user.id,
      },
    });

    await createAuditLog({
      userId: user.id,
      tableName: "invoices",
      recordId: invoice.id,
      action: "create",
      newValues: { invoiceNumber, orderId, totalAmount, balanceDue },
    });

    revalidatePath("/factures");
    revalidatePath(`/commandes/${orderId}`);
    return { success: true, invoice };
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

export async function getInvoices() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return prisma.invoice.findMany({
    where: { deletedAt: null },
    include: {
      order: {
        include: {
          client: { select: { fullName: true } },
        },
      },
      currency: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
