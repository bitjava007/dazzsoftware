import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | null | undefined,
  currency = "XOF",
  locale = "fr-FR"
): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(
  date: Date | string | null | undefined,
  formatStr = "dd/MM/yyyy"
): string {
  if (!date) return "—";
  return format(new Date(date), formatStr, { locale: fr });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: fr });
}

export function generateOrderNumber(prefix = "CMD"): string {
  const date = format(new Date(), "yyyyMM");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${date}-${random}`;
}

export function generateExpenseNumber(prefix = "DEP"): string {
  const date = format(new Date(), "yyyyMM");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${date}-${random}`;
}

export function generatePaymentNumber(prefix = "PAY"): string {
  const date = format(new Date(), "yyyyMM");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${date}-${random}`;
}

export function generateReceiptNumber(prefix = "RECU"): string {
  const date = format(new Date(), "yyyyMM");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${date}-${random}`;
}

export function generateInvoiceNumber(prefix = "FACT"): string {
  const date = format(new Date(), "yyyyMM");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${date}-${random}`;
}

export function generateSupplyCode(prefix = "FOU"): string {
  const date = format(new Date(), "yyyyMM");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${date}-${random}`;
}

export function generateEntryRef(): string {
  const date = format(new Date(), "yyyyMM");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `ENT-${date}-${random}`;
}

export function generateExitRef(): string {
  const date = format(new Date(), "yyyyMM");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `SOR-${date}-${random}`;
}

export function generateTransferRef(): string {
  const date = format(new Date(), "yyyyMM");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `TRF-${date}-${random}`;
}

export function generateAdjustmentRef(): string {
  const date = format(new Date(), "yyyyMM");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `AJU-${date}-${random}`;
}

export function generateInventoryRef(): string {
  const date = format(new Date(), "yyyyMM");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${date}-${random}`;
}

export function formatQuantity(qty: number | string | null | undefined, unit: string): string {
  if (qty === null || qty === undefined) return "—";
  return `${Number(qty).toLocaleString("fr-FR")} ${unit}`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function calculateBalanceDue(
  sellingPrice: number,
  payments: { amountOriginal: number }[]
): number {
  const totalPaid = payments.reduce((sum, p) => sum + p.amountOriginal, 0);
  return sellingPrice - totalPaid;
}

export function calculateProductionCost(
  expenses: { amountOriginal: number }[]
): number {
  return expenses.reduce((sum, e) => sum + e.amountOriginal, 0);
}

export function calculateGrossMargin(
  sellingPrice: number,
  productionCost: number
): number {
  return sellingPrice - productionCost;
}
