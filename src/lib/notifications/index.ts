import { prisma } from "@/lib/prisma";
import { NotifChannel, NotifEventType, NotifStatus } from "@prisma/client";

interface NotifSettings {
  whatsappEnabled: boolean;
  whatsappApiKey: string | null;
  whatsappPhoneNumberId: string | null;
  whatsappBusinessAccountId: string | null;
  companySenderName: string | null;
  smsEnabled: boolean;
  emailEnabled: boolean;
}

interface SendResult {
  success: boolean;
  providerResponse?: string;
}

function formatMessage(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

const TEMPLATES: Record<string, string> = {
  order_created: `Bonjour {{client_name}},\nVotre commande {{order_number}} a bien été enregistrée chez {{company_name}}.\nDate prévue de livraison : {{delivery_date}}\nMontant total : {{total}}\nMerci pour votre confiance.`,
  order_ready: `Bonjour {{client_name}},\nVotre commande {{order_number}} est maintenant prête pour livraison chez {{company_name}}.\nMerci de nous contacter pour convenir du retrait.\nMerci pour votre confiance.`,
  order_delivered: `Bonjour {{client_name}},\nVotre commande {{order_number}} a été livrée avec succès.\nMerci de votre confiance en {{company_name}} !\nNous espérons vous revoir bientôt.`,
  manual_send: `Bonjour {{client_name}},\nVotre commande {{order_number}} est actuellement en cours de traitement chez {{company_name}}.\nMerci pour votre confiance.`,
};

async function sendWhatsApp(
  settings: NotifSettings,
  recipient: string,
  message: string,
): Promise<SendResult> {
  if (!settings.whatsappEnabled) {
    return { success: false, providerResponse: "WhatsApp désactivé" };
  }

  // Real Meta WhatsApp Business API
  if (
    settings.whatsappApiKey &&
    settings.whatsappPhoneNumberId &&
    settings.whatsappBusinessAccountId
  ) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${settings.whatsappPhoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${settings.whatsappApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: recipient,
            type: "text",
            text: { body: message },
          }),
        },
      );
      const data = await res.json();
      return {
        success: res.ok,
        providerResponse: JSON.stringify(data),
      };
    } catch (err) {
      return { success: false, providerResponse: String(err) };
    }
  }

  // Mock provider when API keys not configured
  console.log(`[WhatsApp MOCK] → ${recipient}: ${message.slice(0, 80)}...`);
  return {
    success: true,
    providerResponse: JSON.stringify({ mock: true, messageId: `mock_${Date.now()}` }),
  };
}

export async function sendOrderNotification(
  orderId: string,
  eventType: NotifEventType,
) {
  try {
    const [order, settings] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          client: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              whatsappNumber: true,
              notificationOptIn: true,
            },
          },
          currency: { select: { symbol: true } },
        },
      }),
      prisma.settings.findFirst(),
    ]);

    if (!order || !order.client) return;
    if (!order.client.notificationOptIn) return;

    const notifSettings: NotifSettings = {
      whatsappEnabled: settings?.whatsappEnabled ?? false,
      whatsappApiKey: settings?.whatsappApiKey ?? null,
      whatsappPhoneNumberId: settings?.whatsappPhoneNumberId ?? null,
      whatsappBusinessAccountId: settings?.whatsappBusinessAccountId ?? null,
      companySenderName: settings?.companySenderName ?? null,
      smsEnabled: settings?.smsEnabled ?? false,
      emailEnabled: settings?.emailEnabled ?? false,
    };

    const companyName = settings?.companySenderName || settings?.companyName || "Dazzling Tailor";
    const deliveryDate = order.expectedDeliveryDate
      ? new Date(order.expectedDeliveryDate).toLocaleDateString("fr-FR")
      : "à définir";
    const total = `${order.currency.symbol} ${Number(order.sellingPrice).toLocaleString("fr-FR")}`;

    const templateKey = eventType as string;
    const template = TEMPLATES[templateKey] ?? TEMPLATES.manual_send;
    const message = formatMessage(template, {
      client_name: order.client.fullName,
      order_number: order.orderNumber,
      company_name: companyName,
      delivery_date: deliveryDate,
      total,
    });

    const channelsToSend: Array<{ channel: NotifChannel; recipient: string }> = [];

    if (notifSettings.whatsappEnabled) {
      const num = order.client.whatsappNumber || order.client.phone;
      if (num) channelsToSend.push({ channel: NotifChannel.whatsapp, recipient: num });
    }

    for (const { channel, recipient } of channelsToSend) {
      let result: SendResult = { success: false };
      if (channel === NotifChannel.whatsapp) {
        result = await sendWhatsApp(notifSettings, recipient, message);
      }

      await prisma.notification.create({
        data: {
          clientId: order.client.id,
          orderId: order.id,
          channel,
          eventType,
          recipient,
          message,
          status: result.success ? NotifStatus.sent : NotifStatus.failed,
          providerResponse: result.providerResponse ?? null,
          sentAt: result.success ? new Date() : null,
        },
      });
    }
  } catch (err) {
    console.error("[sendOrderNotification]", err);
  }
}

export async function sendManualNotification(
  orderId: string,
  channel: NotifChannel,
  recipient: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const [order, settings] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        include: { client: { select: { id: true } } },
      }),
      prisma.settings.findFirst(),
    ]);
    if (!order) return { success: false, error: "Commande introuvable" };

    const notifSettings: NotifSettings = {
      whatsappEnabled: settings?.whatsappEnabled ?? false,
      whatsappApiKey: settings?.whatsappApiKey ?? null,
      whatsappPhoneNumberId: settings?.whatsappPhoneNumberId ?? null,
      whatsappBusinessAccountId: settings?.whatsappBusinessAccountId ?? null,
      companySenderName: settings?.companySenderName ?? null,
      smsEnabled: settings?.smsEnabled ?? false,
      emailEnabled: settings?.emailEnabled ?? false,
    };

    let result: SendResult = { success: false };
    if (channel === NotifChannel.whatsapp) {
      result = await sendWhatsApp(notifSettings, recipient, message);
    }

    await prisma.notification.create({
      data: {
        clientId: order.client!.id,
        orderId: order.id,
        channel,
        eventType: NotifEventType.manual_send,
        recipient,
        message,
        status: result.success ? NotifStatus.sent : NotifStatus.failed,
        providerResponse: result.providerResponse ?? null,
        sentAt: result.success ? new Date() : null,
      },
    });

    return { success: result.success, error: result.success ? undefined : "Envoi échoué" };
  } catch (err) {
    console.error("[sendManualNotification]", err);
    return { success: false, error: String(err) };
  }
}
