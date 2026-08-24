"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, Users, MapPin, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, ClipboardCheck, BarChart3, History, Wrench } from "lucide-react";

const NAV_ITEMS = [
  { href: "/fournitures",              icon: LayoutDashboard,  label: "Tableau de bord", exact: true },
  { href: "/fournitures/liste",        icon: Package,          label: "Fournitures" },
  { href: "/fournitures/entrees",      icon: ArrowDownCircle,  label: "Entrées" },
  { href: "/fournitures/sorties",      icon: ArrowUpCircle,    label: "Sorties" },
  { href: "/fournitures/transferts",   icon: ArrowLeftRight,   label: "Transferts" },
  { href: "/fournitures/inventaire",   icon: ClipboardCheck,   label: "Inventaire" },
  { href: "/fournitures/ajustements",  icon: Wrench,           label: "Ajustements" },
  { href: "/fournitures/etats",        icon: BarChart3,        label: "État du stock" },
  { href: "/fournitures/historique",   icon: History,          label: "Historique" },
  { href: "/fournitures/fournisseurs", icon: Users,            label: "Fournisseurs" },
  { href: "/fournitures/emplacements", icon: MapPin,           label: "Emplacements" },
];

export function FournituresNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="px-4 sm:px-6 overflow-x-auto">
        <nav className="flex gap-0.5 min-w-max py-1">
          {NAV_ITEMS.map((item) => {
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
