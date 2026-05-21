import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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

  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id, deletedAt: null },
      include: {
        order: {
          include: {
            client: true,
            lines: {
              include: { article: true },
              orderBy: { createdAt: "asc" },
            },
            payments: {
              where: { deletedAt: null, paymentType: { notIn: ["remboursement", "remise"] } },
              orderBy: { paymentDate: "asc" },
            },
            currency: true,
          },
        },
        currency: true,
      },
    }),
    prisma.settings.findFirst(),
  ]);

  if (!invoice) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });

  const order = invoice.order;
  const client = order.client;
  const currency = invoice.currency ?? order.currency;
  const currencySymbol = currency.code;

  // ─── Build PDF ─────────────────────────────────────────────────────────────
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const MARGIN = 50;
  const COL_W = width - MARGIN * 2;

  // Colors
  const BLACK = rgb(0, 0, 0);
  const DARK = rgb(0.1, 0.1, 0.1);
  const GRAY = rgb(0.45, 0.45, 0.45);
  const LIGHT_GRAY = rgb(0.92, 0.92, 0.92);
  const BLUE = rgb(0.13, 0.40, 0.87);
  const GREEN = rgb(0.08, 0.64, 0.26);
  const ORANGE = rgb(0.85, 0.38, 0.05);

  let y = height - MARGIN;

  // ─── Logo ────────────────────────────────────────────────────────────────
  const logoUrl = settings?.logo;
  let logoHeight = 0;
  if (logoUrl) {
    try {
      const cleanUrl = logoUrl.split("?")[0];
      const resp = await fetch(cleanUrl);
      if (resp.ok) {
        const logoBytes = await resp.arrayBuffer();
        const contentType = resp.headers.get("content-type") ?? "";
        let logoImage;
        if (contentType.includes("png")) {
          logoImage = await pdfDoc.embedPng(logoBytes);
        } else if (contentType.includes("jpeg") || contentType.includes("jpg")) {
          logoImage = await pdfDoc.embedJpg(logoBytes);
        }
        if (logoImage) {
          const maxH = 60;
          const { width: iW, height: iH } = logoImage.scale(1);
          const scale = Math.min(maxH / iH, 140 / iW);
          const drawW = iW * scale;
          const drawH = iH * scale;
          page.drawImage(logoImage, { x: MARGIN, y: y - drawH, width: drawW, height: drawH });
          logoHeight = drawH + 10;
        }
      }
    } catch {
      /* skip logo on error */
    }
  }

  // ─── Company info ─────────────────────────────────────────────────────────
  const companyName = settings?.companyName ?? "Dazzling Tailor";
  const companyInfoX = MARGIN + (logoHeight > 0 ? 160 : 0);

  page.drawText(companyName, { x: companyInfoX, y: y - 14, size: 14, font: fontBold, color: DARK });
  let cy = y - 30;
  const companyLines = [
    settings?.address,
    settings?.phone,
    settings?.email,
    settings?.taxNumber ? `N° Fiscal: ${settings.taxNumber}` : null,
  ].filter(Boolean) as string[];
  for (const line of companyLines) {
    page.drawText(line, { x: companyInfoX, y: cy, size: 9, font: fontRegular, color: GRAY });
    cy -= 13;
  }

  y -= Math.max(logoHeight, 70);

  // ─── Separator ───────────────────────────────────────────────────────────
  page.drawRectangle({ x: MARGIN, y: y - 2, width: COL_W, height: 1.5, color: BLUE });
  y -= 18;

  // ─── FACTURE title + details ──────────────────────────────────────────────
  page.drawText("FACTURE", { x: MARGIN, y, size: 22, font: fontBold, color: BLUE });

  const detailsX = MARGIN + COL_W - 200;
  const metaRows = [
    ["N° Facture:", invoice.invoiceNumber],
    ["Date:", formatDateStr(invoice.issueDate)],
    ["Commande:", order.orderNumber],
    ["Devise:", currencySymbol],
  ];
  let metaY = y;
  for (const [label, value] of metaRows) {
    page.drawText(label, { x: detailsX, y: metaY, size: 9, font: fontBold, color: GRAY });
    page.drawText(value, { x: detailsX + 75, y: metaY, size: 9, font: fontRegular, color: DARK });
    metaY -= 14;
  }

  y -= 40;

  // ─── Client block ─────────────────────────────────────────────────────────
  page.drawRectangle({ x: MARGIN, y: y - 65, width: 200, height: 80, color: LIGHT_GRAY });
  page.drawText("FACTURÉ À", { x: MARGIN + 8, y: y - 14, size: 8, font: fontBold, color: BLUE });
  page.drawText(client.fullName, { x: MARGIN + 8, y: y - 28, size: 10, font: fontBold, color: DARK });
  let clientY = y - 42;
  const clientLines = [
    client.phone,
    client.email,
    [client.address, client.city, client.country].filter(Boolean).join(", ") || null,
  ].filter(Boolean) as string[];
  for (const line of clientLines) {
    page.drawText(line, { x: MARGIN + 8, y: clientY, size: 9, font: fontRegular, color: GRAY });
    clientY -= 13;
  }

  y -= 85;

  // ─── Line items table ─────────────────────────────────────────────────────
  const colDesc = MARGIN;
  const colQty = MARGIN + COL_W * 0.55;
  const colUnit = MARGIN + COL_W * 0.70;
  const colTotal = MARGIN + COL_W * 0.87;

  // Header row
  page.drawRectangle({ x: MARGIN, y: y - 18, width: COL_W, height: 20, color: BLUE });
  const headers = [
    ["Description", colDesc + 4],
    ["Qté", colQty],
    ["Prix unit.", colUnit],
    ["Total", colTotal],
  ] as const;
  for (const [label, x] of headers) {
    page.drawText(label, { x, y: y - 12, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  }
  y -= 22;

  for (let i = 0; i < order.lines.length; i++) {
    const line = order.lines[i];
    const desc = line.description ?? line.article?.name ?? "—";
    const lineTotal = Number(line.lineTotal);
    const unitPrice = Number(line.unitPrice);

    if (i % 2 === 1) {
      page.drawRectangle({ x: MARGIN, y: y - 16, width: COL_W, height: 18, color: rgb(0.97, 0.97, 0.97) });
    }

    // Truncate long descriptions
    const maxDescChars = 55;
    const displayDesc = desc.length > maxDescChars ? desc.substring(0, maxDescChars) + "…" : desc;

    page.drawText(displayDesc, { x: colDesc + 4, y: y - 10, size: 9, font: fontRegular, color: DARK });
    page.drawText(String(line.quantity), { x: colQty, y: y - 10, size: 9, font: fontRegular, color: DARK });
    page.drawText(formatMoney(unitPrice), { x: colUnit, y: y - 10, size: 9, font: fontRegular, color: DARK });
    page.drawText(formatMoney(lineTotal), { x: colTotal, y: y - 10, size: 9, font: fontBold, color: DARK });
    y -= 19;

    if (y < 150) break; // safety: don't overflow page
  }

  // Bottom border
  page.drawRectangle({ x: MARGIN, y: y - 1, width: COL_W, height: 1, color: BLUE });
  y -= 16;

  // ─── Totals ───────────────────────────────────────────────────────────────
  const totalsX = MARGIN + COL_W - 220;
  const valX = MARGIN + COL_W - 5;

  const drawTotalRow = (label: string, value: string, bold = false, color = DARK) => {
    page.drawText(label, { x: totalsX, y, size: 9, font: bold ? fontBold : fontRegular, color: GRAY });
    page.drawText(value, { x: valX, y, size: 9, font: bold ? fontBold : fontRegular, color, maxWidth: 100 });
    y -= 14;
  };

  const subtotal = Number(order.subtotal ?? invoice.totalAmount);
  const discount = Number(order.discount ?? 0);
  const bonus = Number(order.bonus ?? 0);

  drawTotalRow("Sous-total:", formatMoney(subtotal, currencySymbol));
  if (discount > 0) drawTotalRow("Remise:", `- ${formatMoney(discount, currencySymbol)}`);
  if (bonus > 0) drawTotalRow("Bonus:", `- ${formatMoney(bonus, currencySymbol)}`);

  page.drawRectangle({ x: totalsX, y: y + 11, width: 220, height: 0.75, color: LIGHT_GRAY });
  y -= 4;

  page.drawRectangle({ x: totalsX - 4, y: y - 18, width: 228, height: 28, color: BLUE });
  page.drawText("TOTAL:", { x: totalsX, y: y - 10, size: 11, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText(formatMoney(Number(invoice.totalAmount), currencySymbol), {
    x: valX - 80, y: y - 10, size: 11, font: fontBold, color: rgb(1, 1, 1),
  });
  y -= 30;

  // ─── Payments ─────────────────────────────────────────────────────────────
  if (order.payments.length > 0) {
    page.drawText("Paiements reçus:", { x: MARGIN, y, size: 9, font: fontBold, color: DARK });
    y -= 14;
    for (const payment of order.payments) {
      const method = payment.paymentType.replace(/_/g, " ");
      page.drawText(`• ${formatDateStr(payment.paymentDate)} — ${method}`, {
        x: MARGIN + 8, y, size: 8, font: fontRegular, color: GRAY,
      });
      page.drawText(formatMoney(Number(payment.amountOriginal), currencySymbol), {
        x: valX - 60, y, size: 8, font: fontRegular, color: GREEN,
      });
      y -= 13;
    }
    y -= 6;
  }

  // ─── Balance due ──────────────────────────────────────────────────────────
  const balanceDue = Number(invoice.balanceDue);
  const balanceColor = balanceDue > 0 ? ORANGE : GREEN;
  page.drawText("Solde restant dû:", { x: MARGIN, y, size: 10, font: fontBold, color: DARK });
  page.drawText(formatMoney(balanceDue, currencySymbol), {
    x: valX - 80, y, size: 11, font: fontBold, color: balanceColor,
  });
  y -= 30;

  // ─── Footer ───────────────────────────────────────────────────────────────
  page.drawRectangle({ x: MARGIN, y: 38, width: COL_W, height: 0.75, color: LIGHT_GRAY });
  page.drawText(`${companyName} · Merci pour votre confiance`, {
    x: MARGIN, y: 24, size: 8, font: fontRegular, color: GRAY,
  });
  page.drawText(`Facture générée le ${formatDateStr(new Date())}`, {
    x: MARGIN + COL_W - 140, y: 24, size: 8, font: fontRegular, color: GRAY,
  });

  // ─── Serialize ────────────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();
  const buffer = Buffer.from(pdfBytes);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
