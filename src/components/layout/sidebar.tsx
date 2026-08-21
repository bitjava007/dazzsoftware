"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Ruler, ShoppingBag, ClipboardList,
  Receipt, CreditCard, FileText, BarChart3, Settings, LogOut, Scissors,
  UserCheck, ArrowLeftRight, X, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Branding } from "@/lib/branding";
import type { AppModule } from "@/lib/permissions-shared";

// dashboard always visible — requires no module permission
const ALL_NAV_ITEMS = [
  { href: "/dashboard",      icon: LayoutDashboard, key: "dashboard",      module: null            },
  { href: "/clients",        icon: Users,           key: "clients",        module: "clients"        },
  { href: "/mesures",        icon: Ruler,           key: "mesures",        module: "mesures"        },
  { href: "/articles",       icon: ShoppingBag,     key: "articles",       module: "articles"       },
  { href: "/commandes",      icon: ClipboardList,   key: "commandes",      module: "commandes"      },
  { href: "/depenses",       icon: Receipt,         key: "depenses",       module: "depenses"       },
  { href: "/paiements",      icon: CreditCard,      key: "paiements",      module: "paiements"      },
  { href: "/factures",       icon: FileText,        key: "factures",       module: "factures"       },
  { href: "/rapports",       icon: BarChart3,       key: "rapports",       module: "rapports"       },
  { href: "/taux-de-change", icon: ArrowLeftRight,  key: "taux_de_change", module: "taux_de_change" },
  { href: "/utilisateurs",   icon: UserCheck,       key: "utilisateurs",   module: "utilisateurs"   },
  { href: "/notifications",  icon: Bell,            key: "notifications",  module: "notifications"  },
  { href: "/parametres",     icon: Settings,        key: "parametres",     module: "parametres"     },
] as const;

function SidebarContent({
  onClose,
  branding,
  visibleModules,
}: {
  onClose?: () => void;
  branding: Branding;
  visibleModules: AppModule[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");

  const visibleSet = new Set<string>(visibleModules);
  const navItems = ALL_NAV_ITEMS.filter(
    (item) => item.module === null || visibleSet.has(item.module),
  );

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/connexion");
    router.refresh();
  };

  return (
    <>
      {/* Brand */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-5 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 overflow-hidden"
            style={{ backgroundColor: branding.logo ? "transparent" : branding.buttonColor }}
          >
            {branding.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logo} alt={branding.appName} className="w-full h-full object-contain" />
            ) : (
              <Scissors className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">{branding.appName}</p>
            <p className="text-slate-400 text-xs">{branding.slogan || "ERP Couture"}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
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
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "text-white shadow-lg"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
              style={isActive ? { backgroundColor: branding.buttonColor } : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-700 shrink-0">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-slate-400 hover:bg-slate-800 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          <span>{t("deconnexion")}</span>
        </Button>
      </div>
    </>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  branding: Branding;
  visibleModules: AppModule[];
}

export function Sidebar({ mobileOpen, onMobileClose, branding, visibleModules }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-slate-700 flex-col">
        <SidebarContent branding={branding} visibleModules={visibleModules} />
      </aside>

      {/* Mobile sidebar — slide in from left */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-slate-700 flex flex-col",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onClose={onMobileClose} branding={branding} visibleModules={visibleModules} />
      </aside>
    </>
  );
}
