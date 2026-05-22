"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendManualNotificationAction, triggerOrderNotificationAction } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";
import { MessageSquare, Send, RefreshCw, Loader2 } from "lucide-react";
import { NotifEventType } from "@prisma/client";

type Notification = {
  id: string;
  channel: string;
  eventType: string;
  recipient: string;
  status: string;
  sentAt: Date | null;
  createdAt: Date;
};

const EVENT_LABELS: Record<string, string> = {
  order_created: "Commande confirmée",
  order_ready: "Prête livraison",
  order_delivered: "Livrée",
  manual_send: "Manuel",
};

const STATUS_VARIANTS: Record<string, "default" | "success" | "destructive" | "secondary"> = {
  sent: "success",
  failed: "destructive",
  pending: "secondary",
};

interface Props {
  orderId: string;
  orderNumber: string;
  clientPhone: string | null;
  clientWhatsapp: string | null;
  notifications: Notification[];
}

export function OrderNotifications({
  orderId,
  orderNumber,
  clientPhone,
  clientWhatsapp,
  notifications,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [sendOpen, setSendOpen] = useState(false);
  const [channel, setChannel] = useState("whatsapp");
  const [recipient, setRecipient] = useState(clientWhatsapp || clientPhone || "");
  const [message, setMessage] = useState(`Bonjour,\nVotre commande ${orderNumber} est en cours de traitement.\nMerci pour votre confiance.`);

  const handleSend = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("orderId", orderId);
      fd.set("channel", channel);
      fd.set("recipient", recipient);
      fd.set("message", message);
      const result = await sendManualNotificationAction(fd);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Notification envoyée" });
        setSendOpen(false);
        router.refresh();
      }
    });
  };

  const handleTrigger = (eventType: NotifEventType) => {
    startTransition(async () => {
      const result = await triggerOrderNotificationAction(orderId, eventType);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Notification envoyée automatiquement" });
        router.refresh();
      }
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          Notifications ({notifications.length})
        </CardTitle>
        <div className="flex gap-2">
          <Dialog open={sendOpen} onOpenChange={setSendOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-700">
                <Send className="w-3 h-3 mr-1" />
                Envoyer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Envoyer une notification</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1">
                  <Label>Canal</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Destinataire</Label>
                  <Input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="+243..."
                  />
                </div>
                <div className="space-y-1">
                  <Label>Message</Label>
                  <Textarea
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setSendOpen(false)}>Annuler</Button>
                  <Button
                    onClick={handleSend}
                    disabled={isPending || !recipient || !message}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      {/* Quick trigger buttons */}
      <CardContent className="pt-0 pb-3 px-5">
        <div className="flex flex-wrap gap-1.5 mb-3">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => handleTrigger(NotifEventType.order_created)}
            disabled={isPending}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Confirmée
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => handleTrigger(NotifEventType.order_ready)}
            disabled={isPending}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Prête
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => handleTrigger(NotifEventType.order_delivered)}
            disabled={isPending}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Livrée
          </Button>
        </div>

        {notifications.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Aucune notification envoyée</p>
        ) : (
          <div className="space-y-2">
            {notifications.slice(0, 5).map((n) => (
              <div key={n.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-xs font-medium">{EVENT_LABELS[n.eventType] ?? n.eventType}</p>
                  <p className="text-xs text-gray-400">{n.channel} · {n.recipient}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(n.createdAt)}</p>
                </div>
                <Badge variant={STATUS_VARIANTS[n.status] ?? "secondary"} className="text-xs">
                  {n.status === "sent" ? "Envoyé" : n.status === "failed" ? "Échoué" : "Attente"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
