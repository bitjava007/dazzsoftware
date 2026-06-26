import { NextResponse } from "next/server";
import { PDFDocument, PageSizes } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  safeDrawText,
  drawTrackedText,
  drawRightAlignedText,
  drawTrackedRightAlignedText,
} from "@/lib/pdf-text";
import { loadInvoiceFonts } from "@/lib/invoice-fonts";
import {
  INK,
  SECONDARY,
  RULE,
  GOLD,
  ACCENT_BG,
  TOTAL_BAND,
  DUE,
  RECEIVED,
  WHITE,
  CREAM,
  drawBrandHeader,
  drawGoldGradientRule,
} from "@/lib/invoice-pdf-theme";

// Buffer/pdf-lib require the Node.js runtime (not Edge).
export const runtime = "nodejs";

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  acompte_initial: "Acompte initial",
  acompte: "Acompte",
  paiement_final: "Paiement final",
  bonus: "Bonus",
};

function formatMoney(amount: number, symbol = "") {
  const formatted = amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return symbol ? `${formatted} ${symbol}` : formatted;
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

    const { serifBold, serifItalic, sansRegular, sansMedium } = await loadInvoiceFonts(pdfDoc);

    const MARGIN = 50;
    const COL_W = width - MARGIN * 2;
    // Single right edge shared by every right-aligned element on the page —
    // metadata, table columns, totals, payments and the balance box all line up.
    const RIGHT_EDGE = MARGIN + COL_W;
    // Amounts are inset 14pt so boxed totals (which have their own padding)
    // line up exactly with the unboxed subtotal/payment rows.
    const AMOUNT_RIGHT = RIGHT_EDGE - 14;

    const text = (t: string, options: Parameters<typeof page.drawText>[1]) => safeDrawText(page, t, options);

    let y = height - MARGIN;

    // ─── Header: logo + brand left, contact right ──────────────────────────────
    y = await drawBrandHeader(pdfDoc, page, settings, { serifBold, serifItalic, sansRegular }, MARGIN, RIGHT_EDGE, y);

    // ─── Gold gradient rule ─────────────────────────────────────────────────────
    drawGoldGradientRule(page, MARGIN, COL_W, y);
    y -= 34;

    // ─── "Facture" title + metadata ─────────────────────────────────────────────
    text("Facture", { x: MARGIN, y: y - 28, size: 34, font: serifBold, color: INK });

    const orderRefs = allOrders.map((o) => o.orderNumber).join(", ");
    const metaRows: [string, string][] = [
      ["N° Facture", invoice.invoiceNumber],
      ["Date", formatDateStr(invoice.issueDate)],
      ["Commande", orderRefs || "—"],
      ["Devise", currencySymbol],
    ];
    let metaY = y - 4;
    for (const [label, value] of metaRows) {
      drawTrackedRightAlignedText(page, label.toUpperCase(), RIGHT_EDGE, metaY, { font: sansMedium, size: 7.5, color: SECONDARY, tracking: 0.8 });
      drawRightAlignedText(page, value, RIGHT_EDGE, metaY - 12, { font: sansRegular, size: 10, color: INK });
      metaY -= 28;
    }
    y -= 58;

    // ─── Facturé à ───────────────────────────────────────────────────────────────
    drawTrackedText(page, "FACTURÉ À", MARGIN, y, { font: sansMedium, size: 7.5, color: GOLD, tracking: 1.2 });
    text(client.fullName, { x: MARGIN, y: y - 18, size: 13, font: serifBold, color: INK });
    let clientY = y - 33;
    for (const line of [client.phone, client.email, [client.address, client.city, client.country].filter(Boolean).join(", ") || null].filter(Boolean) as string[]) {
      text(line, { x: MARGIN, y: clientY, size: 9, font: sansRegular, color: SECONDARY });
      clientY -= 13;
    }
    y -= 75;

    // ─── Line items table ───────────────────────────────────────────────────────
    const colDesc = MARGIN;
    const colQty = MARGIN + COL_W * 0.55;
    const colUnit = MARGIN + COL_W * 0.73;

    drawTrackedText(page, "DESCRIPTION", colDesc, y, { font: sansMedium, size: 7.5, color: SECONDARY, tracking: 0.8 });
    drawTrackedRightAlignedText(page, "QTÉ", colQty + 18, y, { font: sansMedium, size: 7.5, color: SECONDARY, tracking: 0.8 });
    drawTrackedRightAlignedText(page, "PRIX UNIT.", colUnit + 30, y, { font: sansMedium, size: 7.5, color: SECONDARY, tracking: 0.8 });
    drawTrackedRightAlignedText(page, "TOTAL", RIGHT_EDGE, y, { font: sansMedium, size: 7.5, color: SECONDARY, tracking: 0.8 });
    y -= 10;
    page.drawRectangle({ x: MARGIN, y, width: COL_W, height: 0.75, color: RULE });
    y -= 20;

    for (const order of allOrders) {
      if (allOrders.length > 1) {
        drawTrackedText(page, `COMMANDE : ${order.orderNumber}`, colDesc, y, { font: sansMedium, size: 8, color: GOLD, tracking: 0.6 });
        y -= 20;
      }

      for (const line of order.lines) {
        if (y < 260) break;
        const desc = line.description ?? line.article?.name ?? "—";
        const displayDesc = desc.length > 52 ? desc.substring(0, 52) + "…" : desc;
        text(displayDesc, { x: colDesc, y, size: 10, font: sansRegular, color: INK });
        drawRightAlignedText(page, String(line.quantity), colQty + 18, y, { font: sansRegular, size: 10, color: INK });
        drawRightAlignedText(page, formatMoney(Number(line.unitPrice)), colUnit + 30, y, { font: sansRegular, size: 10, color: INK });
        drawRightAlignedText(page, formatMoney(Number(line.lineTotal)), RIGHT_EDGE, y, { font: sansMedium, size: 10, color: INK });
        y -= 22;
        page.drawRectangle({ x: MARGIN, y: y + 8, width: COL_W, height: 0.5, color: RULE });
      }
    }
    y -= 10;

    // ─── Totals ──────────────────────────────────────────────────────────────────
    const subtotal = Number(invoice.subtotal ?? invoice.totalAmount);
    const discount = Number(invoice.discount ?? 0);
    const bonus = Number(invoice.bonus ?? 0);
    const totalAmount = Number(invoice.totalAmount);

    drawRightAlignedText(page, "Sous-total", AMOUNT_RIGHT - 110, y, { font: sansRegular, size: 9.5, color: SECONDARY });
    drawRightAlignedText(page, formatMoney(subtotal, currencySymbol), AMOUNT_RIGHT, y, { font: sansRegular, size: 9.5, color: INK });
    y -= 18;
    if (discount > 0) {
      drawRightAlignedText(page, "Remise", AMOUNT_RIGHT - 110, y, { font: sansRegular, size: 9.5, color: SECONDARY });
      drawRightAlignedText(page, `− ${formatMoney(discount, currencySymbol)}`, AMOUNT_RIGHT, y, { font: sansRegular, size: 9.5, color: DUE });
      y -= 18;
    }
    if (bonus > 0) {
      drawRightAlignedText(page, "Bonus", AMOUNT_RIGHT - 110, y, { font: sansRegular, size: 9.5, color: SECONDARY });
      drawRightAlignedText(page, `− ${formatMoney(bonus, currencySymbol)}`, AMOUNT_RIGHT, y, { font: sansRegular, size: 9.5, color: RECEIVED });
      y -= 18;
    }
    y -= 12;

    page.drawRectangle({ x: RIGHT_EDGE - 220, y: y - 12, width: 220, height: 34, color: TOTAL_BAND });
    drawTrackedText(page, "TOTAL", RIGHT_EDGE - 206, y + 1, { font: sansMedium, size: 8.5, color: CREAM, tracking: 1 });
    drawRightAlignedText(page, formatMoney(totalAmount, currencySymbol), AMOUNT_RIGHT, y + 1, { font: serifBold, size: 15, color: WHITE });
    y -= 50;

    // ─── Payments — kept in the same right-aligned column as the totals ────────
    const allPayments = allOrders.flatMap((o) => o.payments);
    if (allPayments.length > 0 && y > 140) {
      drawTrackedRightAlignedText(page, "PAIEMENTS REÇUS", RIGHT_EDGE, y, { font: sansMedium, size: 7.5, color: SECONDARY, tracking: 0.8 });
      y -= 18;
      for (const p of allPayments) {
        if (y < 110) break;
        const label = PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType.replace(/_/g, " ");
        drawRightAlignedText(page, `${formatDateStr(p.paymentDate)} · ${label}`, AMOUNT_RIGHT - 110, y, { font: sansRegular, size: 9.5, color: SECONDARY });
        drawRightAlignedText(page, `− ${formatMoney(Number(p.amountOriginal), currencySymbol)}`, AMOUNT_RIGHT, y, { font: sansMedium, size: 9.5, color: RECEIVED });
        y -= 18;
      }
    }
    y -= 8;

    // ─── Solde restant dû (computed live from the payments above — never
    // trust invoice.balanceDue, which is frozen at invoice-creation time) ───────
    const amountPaid = allPayments.reduce((s, p) => s + Number(p.amountOriginal), 0);
    const balanceDue = Math.max(0, totalAmount - amountPaid);
    const isSettled = balanceDue <= 0;
    const statusColor = isSettled ? RECEIVED : DUE;
    const balanceLabel = isSettled ? "SOLDÉE" : "SOLDE RESTANT DÛ";

    const boxW = 220, boxH = 36, boxX = RIGHT_EDGE - boxW, boxY = y - boxH;
    page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, color: ACCENT_BG });
    page.drawRectangle({ x: boxX, y: boxY, width: 3, height: boxH, color: statusColor });
    drawTrackedText(page, balanceLabel, boxX + 16, boxY + boxH / 2 - 3, { font: sansMedium, size: 8, color: statusColor, tracking: 0.8 });
    drawRightAlignedText(page, formatMoney(balanceDue, currencySymbol), AMOUNT_RIGHT, boxY + boxH / 2 - 5, { font: serifBold, size: 14, color: statusColor });

    // ─── Notes ──────────────────────────────────────────────────────────────────
    if (invoice.notes && boxY - 30 > 60) {
      text("Notes:", { x: MARGIN, y: boxY - 22, size: 9, font: sansMedium, color: SECONDARY });
      text(invoice.notes.substring(0, 120), { x: MARGIN, y: boxY - 34, size: 8.5, font: sansRegular, color: SECONDARY });
    }

    // ─── Footer (anchored to bottom) ────────────────────────────────────────────
    page.drawRectangle({ x: MARGIN, y: 40, width: COL_W, height: 0.75, color: RULE });
    text("Merci de votre confiance.", { x: MARGIN, y: 24, size: 8.5, font: serifItalic, color: SECONDARY });
    drawRightAlignedText(
      page,
      `Facture générée le ${formatDateStr(new Date())} · ${settings?.appName ?? "DazzUrembo App"}`,
      RIGHT_EDGE,
      24,
      { font: sansRegular, size: 8, color: SECONDARY },
    );

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
