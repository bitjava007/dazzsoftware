import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const articles = await prisma.article.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, indicativePrice: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(articles);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
