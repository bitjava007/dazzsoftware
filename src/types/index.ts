export type { Profile, Client, Measurement, Article, Order, Expense, OrderPayment, Invoice, Currency, ExchangeRate, Settings, AuditLog } from "@prisma/client";

export type OrderWithRelations = {
  id: string;
  orderNumber: string;
  clientId: string;
  articleId: string | null;
  measurementId: string | null;
  sellingPrice: number;
  currencyId: string;
  currentStatus: string;
  orderDate: Date;
  expectedDeliveryDate: Date | null;
  actualDeliveryDate: Date | null;
  createdAt: Date;
  client: { id: string; fullName: string; phone: string | null };
  article: { id: string; name: string } | null;
  currency: { id: string; code: string; symbol: string };
  payments: { id: string; amountOriginal: number; paymentType: string }[];
  expenses: { id: string; amountOriginal: number }[];
};

export type ClientWithStats = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
  createdAt: Date;
  _count: { orders: number; measurements: number };
  totalRevenue: number;
  balanceDue: number;
};

export type DashboardStats = {
  commandesEnProduction: number;
  commandesLivrees: number;
  commandesAnnulees: number;
  ventesDuMois: number;
  depensesDuMois: number;
  beneficeBrut: number;
  paiementsRecus: number;
  soldesClients: number;
  totalClients: number;
  nouveauxClients: number;
};

export type ChartData = {
  name: string;
  value: number;
  color?: string;
};

export type MonthlyData = {
  month: string;
  ventes: number;
  depenses: number;
  benefice: number;
};
