import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id, deletedAt: null },
    select: {
      id: true,
      orderNumber: true,
      clientId: true,
      currencyId: true,
      orderDate: true,
      expectedDeliveryDate: true,
      orderDetails: true,
      discount: true,
      bonus: true,
      lines: {
        select: {
          id: true,
          articleId: true,
          description: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(order);
}
