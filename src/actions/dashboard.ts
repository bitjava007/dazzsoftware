"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";

export async function getDashboardStats(startDate?: string, endDate?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const hasRange = !!(startDate || endDate);

  // Period used for KPI aggregations
  const rangeStart = startDate ? new Date(startDate) : startOfMonth(now);
  const rangeEnd = endDate ? new Date(endDate + "T23:59:59") : endOfMonth(now);

  // Generate months for chart
  let chartMonths: Date[];
  if (hasRange) {
    chartMonths = [];
    let cursor = startOfMonth(rangeStart);
    const endCursor = startOfMonth(rangeEnd);
    while (cursor <= endCursor && chartMonths.length < 24) {
      chartMonths.push(new Date(cursor));
      cursor = addMonths(cursor, 1);
    }
    if (chartMonths.length === 0) chartMonths = [startOfMonth(rangeStart)];
  } else {
    chartMonths = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
  }

  const [
    commandesEnProduction,
    commandesLivrees,
    commandesAnnulees,
    totalClients,
    nouveauxClients,
    ventesDuMois,
    depensesDuMois,
    paiementsRecus,
    soldesClients,
    commandesParStatut,
    monthlyData,
    recentLogins,
  ] = await Promise.all([
    // Orders in production — always current state, no date filter
    prisma.order.count({
      where: { deletedAt: null, currentStatus: { notIn: ["brouillon", "livree", "annulee"] } },
    }),
    // Delivered orders in period
    prisma.order.count({
      where: {
        deletedAt: null,
        currentStatus: "livree",
        ...(hasRange ? { orderDate: { gte: rangeStart, lte: rangeEnd } } : {}),
      },
    }),
    // Cancelled orders in period
    prisma.order.count({
      where: {
        deletedAt: null,
        currentStatus: "annulee",
        ...(hasRange ? { orderDate: { gte: rangeStart, lte: rangeEnd } } : {}),
      },
    }),
    // Total active clients — no date filter
    prisma.client.count({ where: { deletedAt: null } }),
    // New clients in period
    prisma.client.count({
      where: { deletedAt: null, createdAt: { gte: rangeStart, lte: rangeEnd } },
    }),
    // Sales in period
    prisma.order.aggregate({
      where: {
        deletedAt: null,
        orderDate: { gte: rangeStart, lte: rangeEnd },
        currentStatus: { notIn: ["brouillon", "annulee"] },
      },
      _sum: { sellingPrice: true },
    }),
    // Expenses in period
    prisma.expense.aggregate({
      where: { deletedAt: null, expenseDate: { gte: rangeStart, lte: rangeEnd } },
      _sum: { amountOriginal: true },
    }),
    // Payments received in period
    prisma.orderPayment.aggregate({
      where: {
        deletedAt: null,
        paymentDate: { gte: rangeStart, lte: rangeEnd },
        paymentType: { notIn: ["remboursement", "remise"] },
      },
      _sum: { amountOriginal: true },
    }),
    // Current balance due — always global
    prisma.order.findMany({
      where: { deletedAt: null, currentStatus: { notIn: ["annulee"] } },
      select: {
        sellingPrice: true,
        payments: {
          where: { deletedAt: null, paymentType: { notIn: ["remboursement", "remise"] } },
          select: { amountOriginal: true },
        },
      },
    }),
    // Orders by status — filtered by period if range set
    prisma.order.groupBy({
      by: ["currentStatus"],
      where: {
        deletedAt: null,
        ...(hasRange ? { orderDate: { gte: rangeStart, lte: rangeEnd } } : {}),
      },
      _count: { id: true },
    }),
    // Monthly chart data
    Promise.all(
      chartMonths.map((date) => {
        const start = startOfMonth(date);
        const end = endOfMonth(date);
        const showYear = chartMonths.length > 6;
        return Promise.all([
          prisma.order.aggregate({
            where: {
              deletedAt: null,
              orderDate: { gte: start, lte: end },
              currentStatus: { notIn: ["brouillon", "annulee"] },
            },
            _sum: { sellingPrice: true },
          }),
          prisma.expense.aggregate({
            where: { deletedAt: null, expenseDate: { gte: start, lte: end } },
            _sum: { amountOriginal: true },
          }),
        ]).then(([ventes, depenses]) => ({
          month: date.toLocaleString("fr-FR", {
            month: "short",
            ...(showYear ? { year: "2-digit" } : {}),
          }),
          ventes: Number(ventes._sum.sellingPrice ?? 0),
          depenses: Number(depenses._sum.amountOriginal ?? 0),
          benefice: Number(ventes._sum.sellingPrice ?? 0) - Number(depenses._sum.amountOriginal ?? 0),
        }));
      })
    ),
    prisma.userLoginHistory.findMany({
      take: 10,
      orderBy: { loginAt: "desc" },
      include: { profile: { select: { fullName: true } } },
    }),
  ]);

  const totalSoldesClients = soldesClients.reduce((acc, order) => {
    const paid = order.payments.reduce((sum, p) => sum + Number(p.amountOriginal), 0);
    return acc + (Number(order.sellingPrice) - paid);
  }, 0);

  const ventesMois = Number(ventesDuMois._sum.sellingPrice ?? 0);
  const depensesMois = Number(depensesDuMois._sum.amountOriginal ?? 0);

  return {
    commandesEnProduction,
    commandesLivrees,
    commandesAnnulees,
    totalClients,
    nouveauxClients,
    ventesDuMois: ventesMois,
    depensesDuMois: depensesMois,
    beneficeBrut: ventesMois - depensesMois,
    paiementsRecus: Number(paiementsRecus._sum.amountOriginal ?? 0),
    soldesClients: totalSoldesClients,
    commandesParStatut,
    monthlyData,
    recentLogins,
  };
}

export async function getCurrencies() {
  return prisma.currency.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });
}

export async function getExchangeRates() {
  return prisma.exchangeRate.findMany({
    where: { isActive: true, deletedAt: null },
    include: { fromCurrency: true, toCurrency: true },
    orderBy: { effectiveDate: "desc" },
    take: 20,
  });
}
