"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, startOfYear, subMonths } from "date-fns";

export async function getDashboardStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

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
    // Orders in production (not draft, not delivered, not cancelled)
    prisma.order.count({
      where: {
        deletedAt: null,
        currentStatus: {
          notIn: ["brouillon", "livree", "annulee"],
        },
      },
    }),
    // Delivered orders
    prisma.order.count({
      where: { deletedAt: null, currentStatus: "livree" },
    }),
    // Cancelled orders
    prisma.order.count({
      where: { deletedAt: null, currentStatus: "annulee" },
    }),
    // Total clients
    prisma.client.count({ where: { deletedAt: null } }),
    // New clients this month
    prisma.client.count({
      where: {
        deletedAt: null,
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    // Sales this month (selling prices of confirmed orders)
    prisma.order.aggregate({
      where: {
        deletedAt: null,
        orderDate: { gte: monthStart, lte: monthEnd },
        currentStatus: { notIn: ["brouillon", "annulee"] },
      },
      _sum: { sellingPrice: true },
    }),
    // Expenses this month
    prisma.expense.aggregate({
      where: {
        deletedAt: null,
        expenseDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amountOriginal: true },
    }),
    // Payments received this month
    prisma.orderPayment.aggregate({
      where: {
        deletedAt: null,
        paymentDate: { gte: monthStart, lte: monthEnd },
        paymentType: { notIn: ["remboursement", "remise"] },
      },
      _sum: { amountOriginal: true },
    }),
    // Total balance due (sum of selling prices - payments)
    prisma.order.findMany({
      where: { deletedAt: null, currentStatus: { notIn: ["annulee"] } },
      select: {
        sellingPrice: true,
        payments: {
          where: {
            deletedAt: null,
            paymentType: { notIn: ["remboursement", "remise"] },
          },
          select: { amountOriginal: true },
        },
      },
    }),
    // Orders by status
    prisma.order.groupBy({
      by: ["currentStatus"],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    // Monthly data for chart (last 6 months)
    Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(now, 5 - i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);
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
            where: {
              deletedAt: null,
              expenseDate: { gte: start, lte: end },
            },
            _sum: { amountOriginal: true },
          }),
        ]).then(([ventes, depenses]) => ({
          month: date.toLocaleString("fr-FR", { month: "short" }),
          ventes: Number(ventes._sum.sellingPrice ?? 0),
          depenses: Number(depenses._sum.amountOriginal ?? 0),
          benefice:
            Number(ventes._sum.sellingPrice ?? 0) -
            Number(depenses._sum.amountOriginal ?? 0),
        }));
      })
    ),
    // Recent logins
    prisma.userLoginHistory.findMany({
      take: 10,
      orderBy: { loginAt: "desc" },
      include: { profile: { select: { fullName: true } } },
    }),
  ]);

  const totalSoldesClients = soldesClients.reduce((acc, order) => {
    const paid = order.payments.reduce(
      (sum, p) => sum + Number(p.amountOriginal),
      0
    );
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
    include: {
      fromCurrency: true,
      toCurrency: true,
    },
    orderBy: { effectiveDate: "desc" },
    take: 20,
  });
}
