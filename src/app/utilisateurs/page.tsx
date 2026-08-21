import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { Users, ShieldCheck } from "lucide-react";
import { CONFIGURABLE_ROLES } from "@/lib/permissions";

const ROLE_LABELS: Record<string, string> = {
  admin:      "Administrateur",
  manager:    "Manager",
  accountant: "Comptable",
  tailor:     "Tailleur",
  user_basic: "Utilisateur",
};

export default async function UtilisateursPage() {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const [currentProfile, profiles] = await Promise.all([
    prisma.profile.findUnique({ where: { id: currentUser?.id ?? "" }, select: { role: true } }),
    prisma.profile.findMany({
      include: {
        loginHistory: {
          orderBy: { loginAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const isAdmin = currentProfile?.role === "admin";

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
        <p className="text-sm text-gray-500 mt-1">{profiles.length} utilisateur{profiles.length !== 1 ? "s" : ""}</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead>Statut connexion</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-12 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>Aucun utilisateur</p>
                  </TableCell>
                </TableRow>
              ) : (
                profiles.map((profile) => {
                  const lastLogin = profile.loginHistory[0];
                  const isConfigurable = (CONFIGURABLE_ROLES as readonly string[]).includes(profile.role);
                  return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600">
                              {profile.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{profile.fullName}</p>
                            {profile.id === currentUser?.id && (
                              <p className="text-xs text-blue-500">Vous</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ROLE_LABELS[profile.role] ?? profile.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={profile.isActive ? "success" : "destructive"}>
                          {profile.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {lastLogin ? formatDateTime(lastLogin.loginAt) : "Jamais"}
                      </TableCell>
                      <TableCell>
                        {lastLogin ? (
                          <Badge variant={lastLogin.loginStatus === "success" ? "success" : "destructive"}>
                            {lastLogin.loginStatus === "success" ? "Succès" : "Échec"}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {isConfigurable ? (
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs"
                            >
                              <Link href={`/utilisateurs/${profile.id}/permissions`}>
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Permissions
                              </Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">Accès complet</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
