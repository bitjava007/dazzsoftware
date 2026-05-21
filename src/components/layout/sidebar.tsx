"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Ruler, ShoppingBag, ClipboardList,
  Receipt, CreditCard, FileText, BarChart3, Settings, LogOut, Scissors,
  UserCheck, ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/clients", icon: Users, key: "clients" },
  { href: "/mesures", icon: Ruler, key: "mesures" },
  { href: "/articles", icon: ShoppingBag, key: "articles" },
  { href: "/commandes", icon: ClipboardList, key: "commandes" },
  { href: "/depenses", icon: Receipt, key: "depenses" },
  { href: "/paiements", icon: CreditCard, key: "paiements" },
  { href: "/factures", icon: FileText, key: "factures" },
  { href: "/rapports", icon: BarChart3, key: "rapports" },
  { href: "/taux-de-change", icon: ArrowLeftRight, key: "taux_de_change" },
  { href: "/utilisateurs", icon: UserCheck, key: "utilisateurs" },
  { href: "/parametres", icon: Settings, key: "parametres" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/connexion");
    router.refresh();
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-700 flex flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="flex items-center justify-center w-9 h-9 bg-blue-600 rounded-lg">
          <Scissors className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-tight">Dazzling Tailor</p>
          <p className="text-slate-400 text-xs">ERP Couture</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-700">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-400 hover:bg-slate-800 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          <span>{t("deconnexion")}</span>
        </Button>
      </div>
    </aside>
  );
}
