"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteClientAction } from "@/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Eye, Edit2, Trash2, Search, Phone, Mail } from "lucide-react";

interface Client {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
  createdAt: Date;
  _count: { orders: number; measurements: number };
  totalRevenue: number;
  balanceDue: number;
}

interface ClientsTableProps {
  clients: Client[];
}

export function ClientsTable({ clients }: ClientsTableProps) {
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const filtered = clients.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Supprimer le client "${name}" ?`)) return;
    startTransition(async () => {
      const result = await deleteClientAction(id);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Client supprimé", variant: "default" });
        router.refresh();
      }
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher un client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead className="text-center">Commandes</TableHead>
              <TableHead className="text-right">Chiffre d&apos;affaires</TableHead>
              <TableHead className="text-right">Solde dû</TableHead>
              <TableHead>Depuis le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                  Aucun client trouvé
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="font-medium">{client.fullName}</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {client.phone && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Phone className="w-3 h-3" />
                          {client.phone}
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Mail className="w-3 h-3" />
                          {client.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {[client.city, client.country].filter(Boolean).join(", ") || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{client._count.orders}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(client.totalRevenue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={client.balanceDue > 0 ? "text-orange-600 font-medium" : "text-green-600"}>
                      {formatCurrency(client.balanceDue)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatDate(client.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/clients/${client.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/clients/${client.id}/modifier`}>
                          <Edit2 className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(client.id, client.fullName)}
                        disabled={isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
