import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createUser } from "@/actions/utilisateurs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NouvelUtilisateurPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (profile?.role !== "admin") redirect("/utilisateurs");

  return (
    <div className="p-4 sm:p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/utilisateurs">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvel utilisateur</h1>
          <p className="text-sm text-gray-500 mt-0.5">Créer un compte pour un membre de l&apos;équipe</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Informations du compte</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUser} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input id="fullName" name="fullName" placeholder="Jean Dupont" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Adresse email</Label>
              <Input id="email" name="email" type="email" placeholder="jean@exemple.com" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="8 caractères minimum"
                minLength={8}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">Rôle</Label>
              <Select name="role" required>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Choisir un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="accountant">Comptable</SelectItem>
                  <SelectItem value="tailor">Tailleur</SelectItem>
                  <SelectItem value="user_basic">Utilisateur de base</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full mt-2">
              Créer l&apos;utilisateur
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
