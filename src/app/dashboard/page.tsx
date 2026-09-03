import { Suspense } from "react";
import { getDashboardStats, getCurrencies } from "@/actions/dashboard";
import { getExchangeRateCheckData } from "@/actions/exchange-rate-check";
import { DashboardContent } from "./dashboard-content";
import { ExchangeRateCheckModal } from "@/components/dashboard/exchange-rate-check-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const start = params.start;
  const end = params.end;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user
    ? await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } })
    : null;
  const isAdmin = profile?.role === "admin";

  const [stats, currencies, rateCheck] = await Promise.all([
    getDashboardStats(start, end),
    getCurrencies(),
    isAdmin ? getExchangeRateCheckData() : Promise.resolve(null),
  ]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Super Admin rate check — shown only to admin, only when rates differ */}
      {isAdmin && rateCheck && (
        <ExchangeRateCheckModal
          storedRate={rateCheck.storedRate}
          liveRate={rateCheck.liveRate}
          liveSource={rateCheck.liveSource}
          lastUpdatedAt={rateCheck.lastUpdatedAt}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-500 mt-1">
            Vue d&apos;ensemble de votre atelier de couture
          </p>
        </div>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent
          stats={stats}
          currencies={currencies}
          defaultStart={start ?? ""}
          defaultEnd={end ?? ""}
        />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
