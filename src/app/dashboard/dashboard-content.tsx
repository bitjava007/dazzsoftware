"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ShoppingBag, TrendingUp, TrendingDown, Users, Package,
  CreditCard, AlertCircle, CheckCircle, Wallet,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  confirmee: "Confirmée",
  mesures_prises: "Mesures prises",
  tissu_achete: "Tissu acheté",
  coupe: "Coupe",
  couture: "Couture",
  essayage: "Essayage",
  retouches: "Retouches",
  finition: "Finition",
  pret_livraison: "Prêt livraison",
  livree: "Livrée",
  annulee: "Annulée",
};

const STATUS_COLORS = [
  "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B",
  "#EF4444", "#06B6D4", "#84CC16", "#EC4899",
  "#F97316", "#6366F1", "#14B8A6", "#DC2626",
];

interface DashboardContentProps {
  stats: Awaited<ReturnType<typeof import("@/actions/dashboard").getDashboardStats>>;
  currencies: Awaited<ReturnType<typeof import("@/actions/dashboard").getCurrencies>>;
  defaultStart?: string;
  defaultEnd?: string;
}

export function DashboardContent({ stats, currencies, defaultStart = "", defaultEnd = "" }: DashboardContentProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const handleApply = () => {
    const params = new URLSearchParams();
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    const qs = params.toString();
    router.push(`/dashboard${qs ? `?${qs}` : ""}`);
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    router.push("/dashboard");
  };

  const isFiltered = !!(defaultStart || defaultEnd);
  const periodLabel = isFiltered ? "sur la période" : "du mois";

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Données indisponibles</p>
      </div>
    );
  }

  const kpiCards = [
    {
      title: "En production",
      value: stats.commandesEnProduction,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Livrées",
      value: stats.commandesLivrees,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Annulées",
      value: stats.commandesAnnulees,
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Total clients",
      value: stats.totalClients,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
      sub: `+${stats.nouveauxClients} ${periodLabel}`,
    },
    {
      title: `Ventes ${periodLabel}`,
      value: formatCurrency(stats.ventesDuMois),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: `Dépenses ${periodLabel}`,
      value: formatCurrency(stats.depensesDuMois),
      icon: TrendingDown,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Bénéfice brut",
      value: formatCurrency(stats.beneficeBrut),
      icon: Wallet,
      color: stats.beneficeBrut >= 0 ? "text-green-600" : "text-red-600",
      bg: stats.beneficeBrut >= 0 ? "bg-green-50" : "bg-red-50",
    },
    {
      title: "Soldes clients",
      value: formatCurrency(stats.soldesClients),
      icon: CreditCard,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
  ];

  const pieData = stats.commandesParStatut.map((item, i) => ({
    name: STATUS_LABELS[item.currentStatus] || item.currentStatus,
    value: item._count.id,
    color: STATUS_COLORS[i % STATUS_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex justify-end">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onApply={handleApply}
          onReset={handleReset}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                    {card.sub && (
                      <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
                    )}
                  </div>
                  <div className={`p-3 rounded-xl ${card.bg}`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Évolution financière {isFiltered ? "(période sélectionnée)" : "(6 mois)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), ""]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                />
                <Legend />
                <Bar dataKey="ventes" name="Ventes" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="depenses" name="Dépenses" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="benefice" name="Bénéfice" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Commandes par statut {isFiltered ? "(période)" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend formatter={(value) => <span style={{ fontSize: "11px" }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Aucune commande</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Logins */}
      {stats.recentLogins.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Dernières connexions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentLogins.slice(0, 5).map((login) => (
                <div key={login.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{login.profile?.fullName ?? "—"}</p>
                      <p className="text-xs text-gray-500">{login.ipAddress ?? "IP inconnue"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={login.loginStatus === "success" ? "success" : "destructive"}>
                      {login.loginStatus === "success" ? "Succès" : "Échec"}
                    </Badge>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(login.loginAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
