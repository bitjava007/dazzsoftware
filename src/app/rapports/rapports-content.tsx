"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeFilter } from "@/components/ui/date-range-filter";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon", confirmee: "Confirmée", mesures_prises: "Mesures prises",
  tissu_achete: "Tissu acheté", coupe: "Coupe", couture: "Couture",
  essayage: "Essayage", retouches: "Retouches", finition: "Finition",
  pret_livraison: "Prêt livraison", livree: "Livrée", annulee: "Annulée",
};

interface ReportData {
  stats: {
    monthlyData: { month: string; ventes: number; depenses: number; benefice: number }[];
    commandesParStatut: { currentStatus: string; _count: { id: number } }[];
    ventesDuMois: number;
    depensesDuMois: number;
    beneficeBrut: number;
    commandesEnProduction: number;
    totalClients: number;
    paiementsRecus: number;
    soldesClients: number;
  } | null;
  topClients: { name: string; total: number; commandes: number }[];
  topArticles: { name: string; quantite: number; total: number }[];
  expensesByCategory: { name: string; total: number; count: number }[];
}

interface RapportsContentProps {
  data: ReportData | null;
  defaultStart?: string;
  defaultEnd?: string;
}

export function RapportsContent({ data, defaultStart = "", defaultEnd = "" }: RapportsContentProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const handleApply = () => {
    const params = new URLSearchParams();
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    const qs = params.toString();
    router.push(`/rapports${qs ? `?${qs}` : ""}`);
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    router.push("/rapports");
  };

  const isFiltered = !!(defaultStart || defaultEnd);
  const periodLabel = isFiltered ? "sur la période" : "du mois";

  if (!data || !data.stats) {
    return <p className="text-gray-400 text-center py-20">Aucune donnée disponible</p>;
  }

  const { stats, topClients, topArticles, expensesByCategory } = data;

  const statusData = stats.commandesParStatut
    .map((s) => ({
      name: STATUS_LABELS[s.currentStatus] ?? s.currentStatus,
      value: s._count.id,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
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

      <Tabs defaultValue="finances">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="finances">Finances</TabsTrigger>
          <TabsTrigger value="commandes">Commandes</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="depenses">Dépenses</TabsTrigger>
        </TabsList>

        {/* Finances */}
        <TabsContent value="finances" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: `Ventes ${periodLabel}`, value: formatCurrency(stats.ventesDuMois), color: "text-blue-700" },
              { label: `Dépenses ${periodLabel}`, value: formatCurrency(stats.depensesDuMois), color: "text-red-600" },
              { label: "Bénéfice brut", value: formatCurrency(stats.beneficeBrut), color: stats.beneficeBrut >= 0 ? "text-green-600" : "text-red-600" },
              { label: `Paiements ${periodLabel}`, value: formatCurrency(stats.paiementsRecus), color: "text-green-600" },
            ].map((kpi) => (
              <Card key={kpi.label} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500">{kpi.label}</p>
                  <p className={`text-lg font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Évolution financière {isFiltered ? "(période sélectionnée)" : "(6 derniers mois)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.monthlyData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="ventes" stroke="#3b82f6" strokeWidth={2} name="Ventes" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="depenses" stroke="#ef4444" strokeWidth={2} name="Dépenses" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="benefice" stroke="#10b981" strokeWidth={2} name="Bénéfice" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commandes */}
        <TabsContent value="commandes" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "En production", value: stats.commandesEnProduction, color: "text-orange-600" },
              { label: "Soldes clients", value: formatCurrency(stats.soldesClients), color: "text-orange-600" },
              { label: "Total clients", value: stats.totalClients, color: "text-blue-700" },
            ].map((kpi) => (
              <Card key={kpi.label} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500">{kpi.label}</p>
                  <p className={`text-2xl font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Commandes par statut {isFiltered ? "(période)" : ""}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ventes mensuelles</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Bar dataKey="ventes" fill="#3b82f6" name="Ventes" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Clients */}
        <TabsContent value="clients" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top 10 clients par chiffre d&apos;affaires</CardTitle>
            </CardHeader>
            <CardContent>
              {topClients.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Aucune donnée</p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart layout="vertical" data={topClients} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Bar dataKey="total" fill="#3b82f6" name="Total CA" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Articles */}
        <TabsContent value="articles" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top articles commandés</CardTitle>
            </CardHeader>
            <CardContent>
              {topArticles.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Aucune donnée</p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart layout="vertical" data={topArticles} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantite" fill="#8b5cf6" name="Quantité" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dépenses */}
        <TabsContent value="depenses" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Dépenses par catégorie</CardTitle>
              </CardHeader>
              <CardContent>
                {expensesByCategory.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Aucune donnée</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={expensesByCategory} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                        {expensesByCategory.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Évolution des dépenses</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Bar dataKey="depenses" fill="#ef4444" name="Dépenses" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
