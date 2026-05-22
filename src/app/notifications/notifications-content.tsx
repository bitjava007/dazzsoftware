"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retryNotificationAction } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/utils";
import { RefreshCw, MessageSquare, Phone, Mail, Loader2 } from "lucide-react";

type Notification = {
  id: string;
  channel: string;
  eventType: string;
  recipient: string;
  message: string;
  status: string;
  providerResponse: string | null;
  sentAt: Date | null;
  createdAt: Date;
  client: { id: string; fullName: string };
  order: { id: string; orderNumber: string } | null;
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
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

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === "whatsapp") return <MessageSquare className="w-3 h-3" />;
  if (channel === "sms") return <Phone className="w-3 h-3" />;
  return <Mail className="w-3 h-3" />;
}

interface Filters {
  status?: string;
  channel?: string;
  start?: string;
  end?: string;
}

export function NotificationsContent({
  notifications,
  filters,
}: {
  notifications: Notification[];
  filters: Filters;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const [status, setStatus] = useState(filters.status ?? "");
  const [channel, setChannel] = useState(filters.channel ?? "");
  const [start, setStart] = useState(filters.start ?? "");
  const [end, setEnd] = useState(filters.end ?? "");

  const handleFilter = () => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (channel) p.set("channel", channel);
    if (start) p.set("start", start);
    if (end) p.set("end", end);
    router.push(`/notifications${p.toString() ? `?${p}` : ""}`);
  };

  const handleReset = () => {
    setStatus(""); setChannel(""); setStart(""); setEnd("");
    router.push("/notifications");
  };

  const handleRetry = (id: string) => {
    setRetryingId(id);
    startTransition(async () => {
      const result = await retryNotificationAction(id);
      setRetryingId(null);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Notification renvoyée" });
        router.refresh();
      }
    });
  };

  const stats = {
    total: notifications.length,
    sent: notifications.filter((n) => n.status === "sent").length,
    failed: notifications.filter((n) => n.status === "failed").length,
  };

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-green-600">Envoyées</p>
            <p className="text-2xl font-bold text-green-700">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-red-500">Échouées</p>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Statut</Label>
              <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="sent">Envoyé</SelectItem>
                  <SelectItem value="failed">Échoué</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Canal</Label>
              <Select value={channel || "all"} onValueChange={(v) => setChannel(v === "all" ? "" : v)}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Du</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-8 text-sm w-36" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Au</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-8 text-sm w-36" />
            </div>
            <Button size="sm" onClick={handleFilter} className="h-8 bg-blue-600 hover:bg-blue-700">
              Filtrer
            </Button>
            <Button size="sm" variant="ghost" onClick={handleReset} className="h-8">
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Commande</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Événement</TableHead>
                <TableHead>Destinataire</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                    Aucune notification
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.client.fullName}</TableCell>
                    <TableCell>
                      {n.order ? (
                        <span className="text-xs font-mono text-blue-600">{n.order.orderNumber}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs">
                        <ChannelIcon channel={n.channel} />
                        {CHANNEL_LABELS[n.channel] ?? n.channel}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-600">
                        {EVENT_LABELS[n.eventType] ?? n.eventType}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 font-mono">{n.recipient}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[n.status] ?? "secondary"} className="text-xs">
                        {n.status === "sent" ? "Envoyé" : n.status === "failed" ? "Échoué" : "En attente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {formatDateTime(n.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {n.status === "failed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRetry(n.id)}
                          disabled={isPending && retryingId === n.id}
                        >
                          {isPending && retryingId === n.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <RefreshCw className="w-4 h-4" />}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
