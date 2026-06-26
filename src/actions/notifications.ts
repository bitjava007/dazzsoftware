"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { sendManualNotification, sendOrderNotification } from "@/lib/notifications";
import { NotifChannel, NotifEventType } from "@prisma/client";

export async function getNotifications(filters?: {
  status?: string;
  channel?: string;
  clientId?: string;
  start?: string;
  end?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return prisma.notification.findMany({
    where: {
      status: filters?.status ? (filters.status as any) : undefined,
      channel: filters?.channel ? (filters.channel as any) : undefined,
      clientId: filters?.clientId || undefined,
      createdAt: {
        gte: filters?.start ? new Date(filters.start) : undefined,
        lte: filters?.end ? new Date(filters.end + "T23:59:59") : undefined,
      },
    },
    include: {
      client: { select: { id: true, fullName: true } },
      order: { select: { id: true, orderNumber: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getOrderNotifications(orderId: string) {
  return prisma.notification.findMany({
    where: { orderId },
    include: {
      client: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function sendManualNotificationAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const orderId = String(formData.get("orderId") || "");
  const channel = String(formData.get("channel") || "whatsapp") as NotifChannel;
  const recipient = String(formData.get("recipient") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!orderId || !recipient || !message) return { error: "Données manquantes" };

  const result = await sendManualNotification(orderId, channel, recipient, message);
  if (!result.success) return { error: result.error || "Envoi échoué" };

  revalidatePath(`/commandes/${orderId}`);
  revalidatePath("/notifications");
  return { success: true };
}

export async function retryNotificationAction(notificationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const notif = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: { order: true },
  });
  if (!notif) return { error: "Notification introuvable" };

  const result = await sendManualNotification(
    notif.orderId!,
    notif.channel,
    notif.recipient,
    notif.message,
  );

  revalidatePath("/notifications");
  if (notif.orderId) revalidatePath(`/commandes/${notif.orderId}`);
  return result.success ? { success: true } : { error: result.error };
}

export async function triggerOrderNotificationAction(
  orderId: string,
  eventType: NotifEventType,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  await sendOrderNotification(orderId, eventType);
  revalidatePath(`/commandes/${orderId}`);
  revalidatePath("/notifications");
  return { success: true };
}

export async function sendTestNotificationAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const channel = String(formData.get("channel") || "whatsapp") as NotifChannel;
  const recipient = String(formData.get("recipient") || "").trim();
  if (!recipient) return { error: "Numéro de test requis" };

  const settings = await prisma.settings.findFirst();
  const appName = settings?.appName || "DazzUrembo App";
  const message = `🧵 Test ${appName} — Les notifications fonctionnent correctement !`;

  const { sendManualNotification: send } = await import("@/lib/notifications");

  const testOrderId = await prisma.order.findFirst({
    where: { deletedAt: null },
    select: { id: true },
  });

  if (!testOrderId) return { error: "Aucune commande disponible pour le test" };

  const result = await send(testOrderId.id, channel, recipient, message);
  return result.success ? { success: true } : { error: result.error };
}
