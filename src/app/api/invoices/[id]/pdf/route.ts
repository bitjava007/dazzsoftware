import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { safeDrawText } from "@/lib/pdf-text";

// Buffer/pdf-lib require the Node.js runtime (not Edge).
export const runtime = "nodejs";

function formatMoney(amount: number, symbol = "") {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${symbol ? ` ${symbol}` : ""}`;
}

function formatDateStr(date: Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;

  let invoice;
  let settings;
  try {
    [invoice, settings] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id, deletedAt: null },
        include: {
          client: true,
          order: {
            include: {
              lines: { include: { article: true }, orderBy: { createdAt: "asc" } },
              payments: {
                where: { deletedAt: null, paymentType: { notIn: ["remboursement", "remise"] } },
                orderBy: { paymentDate: "asc" },
              },
              currency: true,
            },
          },
          items: {
            include: {
              order: {
                include: {
                  lines: { include: { article: true }, orderBy: { createdAt: "asc" } },
                  payments: {
                    where: { deletedAt: null, paymentType: { notIn: ["remboursement", "remise"] } },
                    orderBy: { paymentDate: "asc" },
                  },
                  currency: true,
                },
              },
            },
          },
          currency: true,
        },
      }),
      prisma.settings.findFirst(),
    ]);
  } catch (err) {
    console.error("[invoice/pdf] database error:", err);
    console.error((err as Error)?.stack);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données de la facture", detail: String(err) },
      { status: 500 },
    );
  }

  if (!invoice) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });

  // Resolve client, orders and currency
  const client = invoice.client;
  if (!client) {
    return NextResponse.json(
      { error: "Client introuvable pour cette facture (référence client manquante ou supprimée)" },
      { status: 500 },
    );
  }

  const currency = invoice.currency ?? invoice.order?.currency ?? invoice.items[0]?.order.currency;
  if (!currency) {
    return NextResponse.json(
      { error: "Devise introuvable pour cette facture" },
      { status: 500 },
    );
  }
  const currencySymbol = currency.code ?? "";

  // Collect all orders to display (new multi-order or legacy single-order)
  const allOrders = invoice.items.length > 0
    ? invoice.items.map((i) => i.order)
    : invoice.order ? [invoice.order] : [];

  if (allOrders.length === 0) {
    return NextResponse.json(
      { error: "Cette facture n'a aucune commande associée (impossible de générer les lignes de la facture)" },
      { status: 500 },
    );
  }

  try {
    // ─── Build PDF ──────────────────────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const MARGIN = 50;
    const COL_W = width - MARGIN * 2;

    const DARK = rgb(0.1, 0.1, 0.1);
    const GRAY = rgb(0.45, 0.45, 0.45);
    const LIGHT_GRAY = rgb(0.92, 0.92, 0.92);
    const BLUE = rgb(0.13, 0.40, 0.87);
    const GREEN = rgb(0.08, 0.64, 0.26);
    const ORANGE = rgb(0.85, 0.38, 0.05);

    const text = (t: string, options: Parameters<typeof page.drawText>[1]) => safeDrawText(page, t, options);

    let y = height - MARGIN;

    // ─── Logo ──────────────────────────────────────────────────────────────────
    const logoUrl = settings?.logo;
    let logoHeight = 0;
    if (logoUrl) {
      try {
        const resp = await fetch(logoUrl.split("?")[0]);
        if (resp.ok) {
          const logoBytes = await resp.arrayBuffer();
          const ct = resp.headers.get("content-type") ?? "";
          let img;
          if (ct.includes("png")) img = await pdfDoc.embedPng(logoBytes);
          else if (ct.includes("jpeg") || ct.includes("jpg")) img = await pdfDoc.embedJpg(logoBytes);
          if (img) {
            const maxH = 60;
            const { width: iW, height: iH } = img.scale(1);
            const scale = Math.min(maxH / iH, 140 / iW);
            page.drawImage(img, { x: MARGIN, y: y - iH * scale, width: iW * scale, height: iH * scale });
            logoHeight = iH * scale + 10;
          }
        }
      } catch (logoErr) {
        console.error("[invoice/pdf] logo fetch/embed failed (non-fatal):", logoErr);
      }
    }

    // ─── Company info ───────────────────────────────────────────────────────────
    const companyName = settings?.companyName ?? "Dazzling Tailor";
    const infoX = MARGIN + (logoHeight > 0 ? 160 : 0);
    text(companyName, { x: infoX, y: y - 14, size: 14, font: fontBold, color: DARK });
    let cy = y - 30;
    for (const line of [settings?.address, settings?.phone, settings?.email, settings?.taxNumber ? `N° Fiscal: ${settings.taxNumber}` : null].filter(Boolean) as string[]) {
      text(line, { x: infoX, y: cy, size: 9, font: fontRegular, color: GRAY });
      cy -= 13;
    }
    y -= Math.max(logoHeight, 70);

    // ─── Separator ─────────────────────────────────────────────────────────────
    page.drawRectangle({ x: MARGIN, y: y - 2, width: COL_W, height: 1.5, color: BLUE });
    y -= 18;

    // ─── FACTURE title + metadata ───────────────────────────────────────────────
    text("FACTURE", { x: MARGIN, y, size: 22, font: fontBold, color: BLUE });

    const detailsX = MARGIN + COL_W - 200;
    const orderRefs = allOrders.map((o) => o.orderNumber).join(", ");
    const metaRows: [string, string][] = [
      ["N° Facture:", invoice.invoiceNumber],
      ["Date:", formatDateStr(invoice.issueDate)],
      ["Commande(s):", orderRefs || "—"],
      ["Devise:", currencySymbol],
    ];
    let metaY = y;
    for (const [label, value] of metaRows) {
      text(label, { x: detailsX, y: metaY, size: 9, font: fontBold, color: GRAY });
      text(value, { x: detailsX + 75, y: metaY, size: 9, font: fontRegular, color: DARK });
      metaY -= 14;
    }
    y -= 40;

    // ─── Client block ───────────────────────────────────────────────────────────
    page.drawRectangle({ x: MARGIN, y: y - 65, width: 200, height: 80, color: LIGHT_GRAY });
    text("FACTURÉ À", { x: MARGIN + 8, y: y - 14, size: 8, font: fontBold, color: BLUE });
    text(client.fullName, { x: MARGIN + 8, y: y - 28, size: 10, font: fontBold, color: DARK });
    let clientY = y - 42;
    for (const line of [client.phone, client.email, [client.address, client.city, client.country].filter(Boolean).join(", ") || null].filter(Boolean) as string[]) {
      text(line, { x: MARGIN + 8, y: clientY, size: 9, font: fontRegular, color: GRAY });
      clientY -= 13;
    }
    y -= 85;

    // ─── Line items table ───────────────────────────────────────────────────────
    const colDesc = MARGIN;
    const colQty = MARGIN + COL_W * 0.52;
    const colUnit = MARGIN + COL_W * 0.67;
    const colTotal = MARGIN + COL_W * 0.84;

    page.drawRectangle({ x: MARGIN, y: y - 18, width: COL_W, height: 20, color: BLUE });
    for (const [label, x] of [["Description", colDesc + 4], ["Qté", colQty], ["Prix unit.", colUnit], ["Total", colTotal]] as const) {
      text(label, { x, y: y - 12, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    }
    y -= 22;

    let rowIdx = 0;
    for (const order of allOrders) {
      // Order header row if multiple orders
      if (allOrders.length > 1) {
        page.drawRectangle({ x: MARGIN, y: y - 14, width: COL_W, height: 16, color: rgb(0.94, 0.96, 1) });
        text(`Commande : ${order.orderNumber}`, { x: colDesc + 4, y: y - 9, size: 8, font: fontBold, color: BLUE });
        y -= 17;
      }

      for (const line of order.lines) {
        if (y < 150) break;
        const desc = line.description ?? line.article?.name ?? "—";
        const displayDesc = desc.length > 52 ? desc.substring(0, 52) + "…" : desc;
        if (rowIdx % 2 === 1) page.drawRectangle({ x: MARGIN, y: y - 16, width: COL_W, height: 18, color: rgb(0.97, 0.97, 0.97) });
        text(displayDesc, { x: colDesc + 4, y: y - 10, size: 9, font: fontRegular, color: DARK });
        text(String(line.quantity), { x: colQty, y: y - 10, size: 9, font: fontRegular, color: DARK });
        text(formatMoney(Number(line.unitPrice)), { x: colUnit, y: y - 10, size: 9, font: fontRegular, color: DARK });
        text(formatMoney(Number(line.lineTotal)), { x: colTotal, y: y - 10, size: 9, font: fontBold, color: DARK });
        y -= 19;
        rowIdx++;
      }
    }

    page.drawRectangle({ x: MARGIN, y: y - 1, width: COL_W, height: 1, color: BLUE });
    y -= 16;

    // ─── Totals ─────────────────────────────────────────────────────────────────
    const totalsX = MARGIN + COL_W - 220;
    const valX = MARGIN + COL_W - 5;

    const drawRow = (label: string, value: string, bold = false, color = DARK) => {
      text(label, { x: totalsX, y, size: 9, font: bold ? fontBold : fontRegular, color: GRAY });
      text(value, { x: valX, y, size: 9, font: bold ? fontBold : fontRegular, color });
      y -= 14;
    };

    const subtotal = Number(invoice.subtotal ?? invoice.totalAmount);
    const discount = Number(invoice.discount ?? 0);
    const bonus = Number(invoice.bonus ?? 0);

    drawRow("Sous-total:", formatMoney(subtotal, currencySymbol));
    if (discount > 0) drawRow("Remise:", `- ${formatMoney(discount, currencySymbol)}`);
    if (bonus > 0) drawRow("Bonus:", `- ${formatMoney(bonus, currencySymbol)}`);

    page.drawRectangle({ x: totalsX, y: y + 11, width: 220, height: 0.75, color: LIGHT_GRAY });
    y -= 4;

    page.drawRectangle({ x: totalsX - 4, y: y - 18, width: 228, height: 28, color: BLUE });
    text("TOTAL:", { x: totalsX, y: y - 10, size: 11, font: fontBold, color: rgb(1, 1, 1) });
    text(formatMoney(Number(invoice.totalAmount), currencySymbol), {
      x: valX - 80, y: y - 10, size: 11, font: fontBold, color: rgb(1, 1, 1),
    });
    y -= 30;

    // ─── Payments ───────────────────────────────────────────────────────────────
    const allPayments = allOrders.flatMap((o) => o.payments);
    if (allPayments.length > 0) {
      text("Paiements reçus:", { x: MARGIN, y, size: 9, font: fontBold, color: DARK });
      y -= 14;
      for (const p of allPayments) {
        if (y < 60) break;
        const method = p.paymentType.replace(/_/g, " ");
        text(`• ${formatDateStr(p.paymentDate)} — ${method}`, {
          x: MARGIN + 8, y, size: 8, font: fontRegular, color: GRAY,
        });
        text(formatMoney(Number(p.amountOriginal), currencySymbol), {
          x: valX - 60, y, size: 8, font: fontRegular, color: GREEN,
        });
        y -= 13;
      }
      y -= 6;
    }

    // ─── Balance ────────────────────────────────────────────────────────────────
    if (y > 60) {
      const balanceDue = Number(invoice.balanceDue);
      const balColor = balanceDue > 0 ? ORANGE : GREEN;
      text("Solde restant dû:", { x: MARGIN, y, size: 10, font: fontBold, color: DARK });
      text(formatMoney(balanceDue, currencySymbol), {
        x: valX - 80, y, size: 11, font: fontBold, color: balColor,
      });
      y -= 24;
    }

    // ─── Notes ──────────────────────────────────────────────────────────────────
    if (invoice.notes && y > 60) {
      text("Notes:", { x: MARGIN, y, size: 9, font: fontBold, color: GRAY });
      y -= 12;
      text(invoice.notes.substring(0, 120), { x: MARGIN, y, size: 8, font: fontRegular, color: GRAY });
    }

    // ─── Footer ─────────────────────────────────────────────────────────────────
    page.drawRectangle({ x: MARGIN, y: 38, width: COL_W, height: 0.75, color: LIGHT_GRAY });
    text(`${companyName} · Merci pour votre confiance`, {
      x: MARGIN, y: 24, size: 8, font: fontRegular, color: GRAY,
    });
    text(`Facture générée le ${formatDateStr(new Date())}`, {
      x: MARGIN + COL_W - 140, y: 24, size: 8, font: fontRegular, color: GRAY,
    });

    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[invoice/pdf] PDF generation error:", err);
    console.error((err as Error)?.stack);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF", detail: String(err) },
      { status: 500 },
    );
  }
}
