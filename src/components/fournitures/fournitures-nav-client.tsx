"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, Users, MapPin,
  ArrowDownCircle, ArrowUpCircle, ArrowLeftRight,
  ClipboardCheck, BarChart3, History, Wrench,
} from "lucide-react";
import type { AppModule } from "@/lib/permissions-shared";

const ALL_NAV_ITEMS: { href: string; icon: React.ElementType; label: string; module: AppModule | null; exact?: boolean }[] = [
  { href: "/fournitures",              icon: LayoutDashboard, label: "Tableau de bord", module: null, exact: true },
  { href: "/fournitures/liste",        icon: Package,         label: "Fournitures",     module: "fournitures" },
  { href: "/fournitures/entrees",      icon: ArrowDownCircle, label: "Entrées",          module: "fournitures_entrees" },
  { href: "/fournitures/sorties",      icon: ArrowUpCircle,   label: "Sorties",          module: "fournitures_sorties" },
  { href: "/fournitures/transferts",   icon: ArrowLeftRight,  label: "Transferts",       module: "fournitures_transferts" },
  { href: "/fournitures/inventaire",   icon: ClipboardCheck,  label: "Inventaire",       module: "fournitures_inventaire" },
  { href: "/fournitures/ajustements",  icon: Wrench,          label: "Ajustements",      module: "fournitures_ajustements" },
  { href: "/fournitures/etats",        icon: BarChart3,       label: "État du stock",    module: "fournitures_etat_stock" },
  { href: "/fournitures/historique",   icon: History,         label: "Historique",       module: "fournitures_historique" },
  { href: "/fournitures/fournisseurs", icon: Users,           label: "Fournisseurs",     module: "fournitures_fournisseurs" },
  { href: "/fournitures/emplacements", icon: MapPin,          label: "Emplacements",     module: "fournitures_emplacements" },
];

interface Props {
  visibleModules: AppModule[];
}

export function FournituresNavClient({ visibleModules }: Props) {
  const pathname = usePathname();

  const items = ALL_NAV_ITEMS.filter(
    (item) => item.module === null || visibleModules.includes(item.module)
  );

  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="px-4 sm:px-6 overflow-x-auto">
        <nav className="flex gap-0.5 min-w-max py-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
