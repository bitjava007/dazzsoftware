import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getUserPermissions, CONFIGURABLE_ROLES } from "@/lib/permissions";
import { PermissionsForm } from "./permissions-form";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<string, string> = {
  accountant: "Comptable",
  tailor:     "Tailleur",
  user_basic: "Utilisateur",
};

export default async function UserPermissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user: me } } = await supabase.auth.getUser();
  if (!me) redirect("/connexion");

  const caller = await prisma.profile.findUnique({
    where: { id: me.id },
    select: { role: true },
  });
  if (!caller || caller.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const target = await prisma.profile.findUnique({
    where: { id },
    select: { id: true, fullName: true, role: true, isActive: true },
  });
  if (!target) notFound();

  if (!(CONFIGURABLE_ROLES as readonly string[]).includes(target.role)) {
    redirect("/utilisateurs");
  }

  const permissions = await getUserPermissions(target.id);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <Link
          href="/utilisateurs"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> Retour aux utilisateurs
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{target.fullName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary">{ROLE_LABELS[target.role] ?? target.role}</Badge>
              {!target.isActive && <Badge variant="destructive">Inactif</Badge>}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-3">
          Choisissez les modules auxquels cet utilisateur a accès et les actions qu&apos;il peut effectuer.
          Les droits s&apos;appliquent immédiatement à sa prochaine navigation.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-800">
            Permissions par module
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PermissionsForm userId={target.id} initial={permissions} />
        </CardContent>
      </Card>
    </div>
  );
}
