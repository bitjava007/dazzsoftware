import { notFound } from "next/navigation";
import Link from "next/link";
import { getClientById } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowLeft, Phone, Mail, MapPin, Edit2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon", confirmee: "Confirmée", mesures_prises: "Mesures prises",
  tissu_achete: "Tissu acheté", coupe: "Coupe", couture: "Couture",
  essayage: "Essayage", retouches: "Retouches", finition: "Finition",
  pret_livraison: "Prêt livraison", livree: "Livrée", annulee: "Annulée",
};

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);

  if (!client) notFound();

  const totalRevenue = client.orders.reduce((sum, o) => sum + Number(o.sellingPrice), 0);
  const totalPaid = client.orders.reduce(
    (sum, o) => sum + o.payments.reduce((s, p) => s + Number(p.amountOriginal), 0), 0
  );
  const balanceDue = totalRevenue - totalPaid;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/clients"><ArrowLeft className="w-4 h-4 mr-1" />Retour</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{client.fullName}</h1>
            <p className="text-sm text-gray-500">Client depuis le {formatDate(client.createdAt)}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/clients/${id}/modifier`}><Edit2 className="w-4 h-4 mr-1" />Modifier</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-gray-500">Total facturé</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-gray-500">Total payé</p>
            <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-gray-500">Solde dû</p>
            <p className={`text-xl font-bold mt-1 ${balanceDue > 0 ? "text-orange-600" : "text-green-600"}`}>
              {formatCurrency(balanceDue)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <p className="text-xs text-gray-500">Commandes</p>
            <p className="text-xl font-bold mt-1">{client.orders.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Coordonnées</CardTitle></CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{client.email}</span>
              </div>
            )}
            {(client.city || client.country) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{[client.city, client.country].filter(Boolean).join(", ")}</span>
              </div>
            )}
            {client.address && (
              <div className="text-sm text-gray-500">{client.address}</div>
            )}
            {client.notes && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-600">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="commandes">
            <TabsList>
              <TabsTrigger value="commandes">Commandes ({client.orders.length})</TabsTrigger>
              <TabsTrigger value="mesures">Mesures ({client.measurements.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="commandes">
              <Card className="border-0 shadow-sm mt-2">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Commande</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Prix</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {client.orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-400">Aucune commande</TableCell>
                        </TableRow>
                      ) : (
                        client.orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {STATUS_LABELS[order.currentStatus] ?? order.currentStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(Number(order.sellingPrice))}
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">{formatDate(order.orderDate)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/commandes/${order.id}`}>Voir</Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="mesures">
              <Card className="border-0 shadow-sm mt-2">
                <CardContent className="p-4">
                  {client.measurements.length === 0 ? (
                    <p className="text-center py-8 text-gray-400">Aucune mesure</p>
                  ) : (
                    <div className="space-y-4">
                      {client.measurements.map((m) => (
                        <div key={m.id} className="p-4 bg-gray-50 rounded-lg">
                          <p className="font-medium text-sm mb-3">{m.profileName ?? "Mesures générales"}</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            {[
                              ["Poitrine", m.chest?.toString()], ["Taille", m.waist?.toString()], ["Hanches", m.hips?.toString()],
                              ["Épaules", m.shoulders?.toString()], ["Long. bras", m.armLength?.toString()], ["Cou", m.neck?.toString()],
                              ["Long. robe", m.dressLength?.toString()], ["Long. pantalon", m.trouserLength?.toString()],
                            ].map(([label, value]) => value ? (
                              <div key={String(label)}>
                                <span className="text-gray-400">{label}: </span>
                                <span className="font-medium">{value} cm</span>
                              </div>
                            ) : null)}
                          </div>
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
