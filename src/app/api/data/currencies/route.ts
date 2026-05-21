import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const currencies = await prisma.currency.findMany({
      where: { isActive: true },
      select: { id: true, code: true, symbol: true, name: true },
      orderBy: { code: "asc" },
    });
    return NextResponse.json(currencies);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
