"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface RateCheckResult {
  storedRate: number | null;
  liveRate: number | null;
  liveSource: string;
  lastUpdatedAt: string | null;
  exchangeRateId: string | null;
}

// Fetches current USD→XOF rate from open.er-api.com (free, no API key)
async function fetchLiveUsdXofRate(): Promise<{ rate: number; source: string } | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 }, // cache 1 hour
    });
    if (!res.ok) return null;
    const data = await res.json();
    const xofRate = data?.rates?.XOF;
    if (!xofRate || typeof xofRate !== "number") return null;
    return { rate: Math.round(xofRate), source: "open.er-api.com (Banque mondiale)" };
  } catch {
    return null;
  }
}

export async function getExchangeRateCheckData(): Promise<RateCheckResult> {
  // Get stored USD→XOF rate
  const usdCurrency = await prisma.currency.findFirst({ where: { code: "USD" } });
  const xofCurrency = await prisma.currency.findFirst({ where: { code: "XOF" } });

  let storedRate: number | null = null;
  let lastUpdatedAt: string | null = null;
  let exchangeRateId: string | null = null;

  if (usdCurrency && xofCurrency) {
    const latestRate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrencyId: usdCurrency.id,
        toCurrencyId:   xofCurrency.id,
        deletedAt:      null,
        isActive:       true,
      },
      orderBy: { effectiveDate: "desc" },
    });
    if (latestRate) {
      storedRate      = Math.round(Number(latestRate.rate));
      lastUpdatedAt   = latestRate.effectiveDate.toISOString();
      exchangeRateId  = latestRate.id;
    }
  }

  const live = await fetchLiveUsdXofRate();

  return {
    storedRate,
    liveRate:   live?.rate ?? null,
    liveSource: live?.source ?? "open.er-api.com",
    lastUpdatedAt,
    exchangeRateId,
  };
}

export async function updateExchangeRateFromLive(liveRate: number): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié" };

  const profile = await prisma.profile.findUnique({ where: { id: user.id }, select: { role: true } });
  if (profile?.role !== "admin") return { ok: false, error: "Réservé au Super Administrateur" };

  const usdCurrency = await prisma.currency.findFirst({ where: { code: "USD" } });
  const xofCurrency = await prisma.currency.findFirst({ where: { code: "XOF" } });
  if (!usdCurrency || !xofCurrency) return { ok: false, error: "Devises USD/XOF introuvables" };

  // Deactivate current active rate
  await prisma.exchangeRate.updateMany({
    where: {
      fromCurrencyId: usdCurrency.id,
      toCurrencyId:   xofCurrency.id,
      deletedAt:      null,
      isActive:       true,
    },
    data: { isActive: false },
  });

  // Create new rate
  await prisma.exchangeRate.create({
    data: {
      fromCurrencyId: usdCurrency.id,
      toCurrencyId:   xofCurrency.id,
      rate:           liveRate,
      effectiveDate:  new Date(),
      isActive:       true,
      source:         "open.er-api.com (mise à jour automatique)",
      createdById:    user.id,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/taux-de-change");
  return { ok: true };
}
