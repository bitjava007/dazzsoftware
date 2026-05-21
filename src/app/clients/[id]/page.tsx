import { notFound } from "next/navigation";
import Link from "next/link";
import { getClientById } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Phone, Mail, MapPin, Edit2, Plus } from "lucide-react";
import { MeasurementActions } from "./measurement-actions";

const STATUS_COLORS: Record<string, string> = {
  brouillon: "bg-gray-100 text-gray-700",
  confirmee: "bg-blue-100 text-blue-700",
  mesures_prises: "bg-blue-100 text-blue-700",
  tissu_achete: "bg-cyan-100 text-cyan-700",
  coupe: "bg-yellow-100 text-yellow-700",
  couture: "bg-orange-100 text-orange-700",
  essayage: "bg-amber-100 text-amber-700",
  retouches: "bg-yellow-100 text-yellow-700",
  finition: "bg-orange-100 text-orange-700",
  pret_livraison: "bg-emerald-100 text-emerald-700",
  livree: "bg-green-100 text-green-700",
  annulee: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon", confirmee: "Confirmée", mesures_prises: "Mesures prises",
  tissu_achete: "Tissu acheté", coupe: "Coupe", couture: "Couture",
  essayage: "Essayage", retouches: "Retouches", finition: "Finition",
  pret_livraison: "Prêt livraison", livree: "Livrée", annulee: "Annulée",
};

const MEASUREMENT_FIELDS = [
  { key: "chest", label: "Poitrine" },
  { key: "waist", label: "Taille" },
  { key: "hips", label: "Hanches" },
  { key: "shoulders", label: "Épaules" },
  { key: "armLength", label: "Long. bras" },
  { key: "neck", label: "Cou" },
  { key: "shirtLength", label: "Long. chemise" },
  { key: "trouserLength", label: "Long. pantalon" },
  { key: "dressLength", label: "Long. robe" },
  { key: "wrist", label: "Poignet" },
  { key: "thigh", label: "Cuisse" },
  { key: "knee", label: "Genou" },
  { key: "ankle", label: "Cheville" },
  { key: "inseam", label: "Entrejambe" },
] as const;

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  const totalRevenue = client.orders.reduce((sum, o) => sum + Number(o.sellingPrice), 0);
  const totalPaid = client.orders.reduce(
    (sum, o) => sum + o.payments.reduce((s, p) => s + Number(p.amountOriginal), 0),
    0
  );
  const balanceDue = totalRevenue - totalPaid;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/clients"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{client.fullName}</h1>
            <p className="text-sm text-gray-500">Client depuis le {formatDate(client.createdAt)}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/clients/${id}/modifier`}><Edit2 className="w-4 h-4 mr-1" />Modifier</Link>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total facturé", value: formatCurrency(totalRevenue), color: "" },
          { label: "Total payé", value: formatCurrency(totalPaid), color: "text-green-600" },
          { label: "Solde dû", value: formatCurrency(balanceDue), color: balanceDue > 0 ? "text-orange-600" : "text-green-600" },
          { label: "Commandes", value: String(client.orders.length), color: "" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Coordonnées</CardTitle></CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 text-sm break-all">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{client.email}</span>
              </div>
            )}
            {(client.city || client.country) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{[client.city, client.country].filter(Boolean).join(", ")}</span>
              </div>
            )}
            {client.address && (
              <div className="text-sm text-gray-500 pl-6">{client.address}</div>
            )}
            {client.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-600">{client.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="commandes">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="commandes">Commandes ({client.orders.length})</TabsTrigger>
              <TabsTrigger value="mesures">Mesures ({client.measurements.length})</TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent value="commandes" className="mt-2">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Historique des commandes</CardTitle>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" asChild>
                    <Link href={`/commandes/nouvelle?clientId=${id}`}><Plus className="w-3 h-3 mr-1" />Nouvelle</Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N°</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {client.orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-400">Aucune commande</TableCell>
                        </TableRow>
                      ) : client.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.currentStatus] ?? "bg-gray-100"}`}>
                              {STATUS_LABELS[order.currentStatus] ?? order.currentStatus}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {formatCurrency(Number(order.sellingPrice))}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                            {formatDate(order.orderDate)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/commandes/${order.id}`}>Voir</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Measurements Tab */}
            <TabsContent value="mesures" className="mt-2">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Mensurations</CardTitle>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" asChild>
                    <Link href={`/mesures/nouveau?clientId=${id}`}><Plus className="w-3 h-3 mr-1" />Nouvelles mesures</Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-4">
                  {client.measurements.length === 0 ? (
                    <p className="text-center py-8 text-gray-400 text-sm">Aucune mesure enregistrée</p>
                  ) : (
                    <div className="space-y-4">
                      {client.measurements.map((m) => (
                        <div key={m.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex items-start justify-between mb-3">
                            <p className="font-medium text-sm">{m.profileName ?? "Mesures générales"}</p>
                            <MeasurementActions
                              measurement={{
                                id: m.id,
                                clientId: m.clientId,
                                profileName: m.profileName,
                                chest: m.chest?.toString() ?? null,
                                waist: m.waist?.toString() ?? null,
                                hips: m.hips?.toString() ?? null,
                                shoulders: m.shoulders?.toString() ?? null,
                                armLength: m.armLength?.toString() ?? null,
                                neck: m.neck?.toString() ?? null,
                                shirtLength: m.shirtLength?.toString() ?? null,
                                trouserLength: m.trouserLength?.toString() ?? null,
                                dressLength: m.dressLength?.toString() ?? null,
                                wrist: m.wrist?.toString() ?? null,
                                thigh: m.thigh?.toString() ?? null,
                                knee: m.knee?.toString() ?? null,
                                ankle: m.ankle?.toString() ?? null,
                                inseam: m.inseam?.toString() ?? null,
                                notes: m.notes,
                              }}
                            />
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                            {MEASUREMENT_FIELDS.map(({ key, label }) => {
                              const val = m[key as keyof typeof m];
                              if (!val) return null;
                              return (
                                <div key={key} className="flex justify-between bg-white rounded px-2 py-1">
                                  <span className="text-gray-400">{label}</span>
                                  <span className="font-medium">{String(val)} cm</span>
                                </div>
                              );
                            })}
                          </div>
                          {m.notes && <p className="text-xs text-gray-500 mt-2 italic">{m.notes}</p>}
                          <p className="text-xs text-gray-400 mt-2">{formatDate(m.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
