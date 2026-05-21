import { getDashboardStats } from "@/actions/dashboard";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { RapportsContent } from "./rapports-content";

async function getReportData(startDate?: string, endDate?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const hasRange = !!(startDate || endDate);
  const rangeStart = startDate ? new Date(startDate) : new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const rangeEnd = endDate ? new Date(endDate + "T23:59:59") : now;

  const [stats, topClients, topArticles, expensesByCategory] = await Promise.all([
    getDashboardStats(startDate, endDate),
    prisma.client.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        fullName: true,
        orders: {
          where: {
            deletedAt: null,
            currentStatus: { notIn: ["annulee"] },
            ...(hasRange ? { orderDate: { gte: rangeStart, lte: rangeEnd } } : {}),
          },
          select: { sellingPrice: true },
        },
      },
      take: 50,
    }),
    prisma.orderLine.groupBy({
      by: ["articleId"],
      where: {
        order: {
          deletedAt: null,
          ...(hasRange ? { orderDate: { gte: rangeStart, lte: rangeEnd } } : {}),
        },
      },
      _count: { id: true },
      _sum: { lineTotal: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 10,
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: {
        deletedAt: null,
        expenseDate: { gte: rangeStart, lte: rangeEnd },
      },
      _sum: { amountOriginal: true },
      _count: { id: true },
    }),
  ]);

  const topClientsData = topClients
    .map((c) => ({
      name: c.fullName,
      total: c.orders.reduce((sum, o) => sum + Number(o.sellingPrice), 0),
      commandes: c.orders.length,
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const articleIds = topArticles.map((a) => a.articleId).filter(Boolean) as string[];
  const articlesData = await prisma.article.findMany({
    where: { id: { in: articleIds } },
    select: { id: true, name: true },
  });
  const topArticlesData = topArticles
    .map((a) => {
      const article = articlesData.find((x) => x.id === a.articleId);
      return {
        name: article?.name ?? "Sans article",
        quantite: a._count.id,
        total: Number(a._sum.lineTotal ?? 0),
      };
    })
    .filter((a) => a.total > 0);

  const categoryIds = expensesByCategory.map((e) => e.categoryId).filter(Boolean) as string[];
  const categoriesData = await prisma.expenseCategory.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const expensesByCategoryData = expensesByCategory
    .map((e) => {
      const cat = categoriesData.find((c) => c.id === e.categoryId);
      return {
        name: cat?.name ?? "Non catégorisé",
        total: Number(e._sum.amountOriginal ?? 0),
        count: e._count.id,
      };
    })
    .filter((e) => e.total > 0)
    .sort((a, b) => b.total - a.total);

  return { stats, topClients: topClientsData, topArticles: topArticlesData, expensesByCategory: expensesByCategoryData };
}

export default async function RapportsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const params = await searchParams;
  const data = await getReportData(params.start, params.end);
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
        <p className="text-sm text-gray-500 mt-1">Analyses et exportations de données</p>
      </div>
      <RapportsContent data={data} defaultStart={params.start ?? ""} defaultEnd={params.end ?? ""} />
    </div>
  );
}
