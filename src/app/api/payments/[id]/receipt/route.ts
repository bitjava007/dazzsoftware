import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { safeDrawText } from "@/lib/pdf-text";

export const runtime = "nodejs";

function fmt(amount: number, symbol = "") {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${symbol ? ` ${symbol}` : ""}`;
}

function fmtDate(date: Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtTime(date: Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Espèces",
  mobile_money: "Mobile Money",
  wave: "Wave",
  orange_money: "Orange Money",
  bank_transfer: "Virement bancaire",
  card: "Carte bancaire",
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  acompte_initial: "Acompte initial",
  acompte: "Acompte",
  paiement_final: "Paiement final",
  remboursement: "Remboursement",
  bonus: "Bonus",
  remise: "Remise",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;

  let payment;
  let settings;
  try {
    [payment, settings] = await Promise.all([
      prisma.orderPayment.findUnique({
        where: { id, deletedAt: null },
        include: {
          order: {
            include: {
              client: true,
              lines: { include: { article: true }, orderBy: { createdAt: "asc" } },
              payments: {
                where: { deletedAt: null },
                orderBy: { paymentDate: "asc" },
              },
              currency: true,
            },
          },
          currency: true,
          createdBy: { select: { fullName: true } },
        },
      }),
      prisma.settings.findFirst(),
    ]);
  } catch (err) {
    console.error("[receipt/route] database error:", err);
    console.error((err as Error)?.stack);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données du paiement", detail: String(err) },
      { status: 500 },
    );
  }

  if (!payment) return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
  if (!payment.order?.client) {
    return NextResponse.json(
      { error: "Client introuvable pour ce paiement (référence client manquante ou supprimée)" },
      { status: 500 },
    );
  }

  try {

  const order = payment.order;
  const client = order.client;
  const currency = payment.currency;
  const sym = currency.code;

  // Compute balances
  const totalOrder = Number(order.sellingPrice);
  const nonRemise = order.payments.filter((p) => !["remboursement", "remise"].includes(p.paymentType));
  const paymentIdx = nonRemise.findIndex((p) => p.id === id);
  const paidBefore = nonRemise.slice(0, Math.max(0, paymentIdx)).reduce((s, p) => s + Number(p.amountOriginal), 0);
  const thisAmount = Number(payment.amountOriginal);
  const paidAfter = paidBefore + thisAmount;
  const remaining = Math.max(0, totalOrder - paidAfter);

  // ─── Build PDF ─────────────────────────────────────────────────────────────
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();

  const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const M = 50;
  const CW = width - M * 2;

  const BLACK = rgb(0, 0, 0);
  const DARK = rgb(0.1, 0.1, 0.1);
  const GRAY = rgb(0.45, 0.45, 0.45);
  const LGRAY = rgb(0.92, 0.92, 0.92);
  const BLUE = rgb(0.13, 0.40, 0.87);
  const GREEN = rgb(0.08, 0.64, 0.26);
  const ORANGE = rgb(0.85, 0.38, 0.05);

  const text = (t: string, options: Parameters<typeof page.drawText>[1]) => safeDrawText(page, t, options);

  let y = height - M;

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
          const maxH = 55;
          const { width: iW, height: iH } = img.scale(1);
          const scale = Math.min(maxH / iH, 130 / iW);
          const dW = iW * scale, dH = iH * scale;
          page.drawImage(img, { x: M, y: y - dH, width: dW, height: dH });
          logoHeight = dH + 8;
        }
      }
    } catch { /* skip */ }
  }

  // ─── Company info ──────────────────────────────────────────────────────────
  const companyName = settings?.companyName ?? "Dazzling Tailor";
  const infoX = M + (logoHeight > 0 ? 155 : 0);
  text(companyName, { x: infoX, y: y - 14, size: 13, font: fontB, color: DARK });
  let cy = y - 28;
  for (const line of [settings?.address, settings?.phone, settings?.email].filter(Boolean) as string[]) {
    text(line, { x: infoX, y: cy, size: 9, font: fontR, color: GRAY });
    cy -= 13;
  }
  y -= Math.max(logoHeight, 65);

  // ─── Blue separator ────────────────────────────────────────────────────────
  page.drawRectangle({ x: M, y: y - 2, width: CW, height: 1.5, color: BLUE });
  y -= 18;

  // ─── Title + receipt metadata ──────────────────────────────────────────────
  text("REÇU DE PAIEMENT", { x: M, y, size: 20, font: fontB, color: BLUE });

  const metaX = M + CW - 210;
  let mY = y;
  for (const [label, value] of [
    ["N° Reçu:", payment.receiptNumber],
    ["Date:", fmtDate(payment.paymentDate)],
    ["Heure:", fmtTime(payment.paymentDate)],
    ["Encaissé par:", payment.createdBy?.fullName ?? "—"],
  ]) {
    text(label, { x: metaX, y: mY, size: 8, font: fontB, color: GRAY });
    text(value, { x: metaX + 80, y: mY, size: 8, font: fontR, color: DARK });
    mY -= 13;
  }
  y -= 45;

  // ─── Client block ──────────────────────────────────────────────────────────
  page.drawRectangle({ x: M, y: y - 55, width: 190, height: 68, color: LGRAY });
  text("CLIENT", { x: M + 8, y: y - 13, size: 8, font: fontB, color: BLUE });
  text(client.fullName, { x: M + 8, y: y - 26, size: 10, font: fontB, color: DARK });
  let clY = y - 40;
  for (const line of [client.phone, client.email].filter(Boolean) as string[]) {
    text(line, { x: M + 8, y: clY, size: 9, font: fontR, color: GRAY });
    clY -= 13;
  }

  // ─── Order number block ────────────────────────────────────────────────────
  const orderX = M + 210;
  page.drawRectangle({ x: orderX, y: y - 55, width: CW - 210, height: 68, color: LGRAY });
  text("COMMANDE", { x: orderX + 8, y: y - 13, size: 8, font: fontB, color: BLUE });
  text(order.orderNumber, { x: orderX + 8, y: y - 26, size: 10, font: fontB, color: DARK });
  text(`Total commande: ${fmt(totalOrder, sym)}`, { x: orderX + 8, y: y - 40, size: 9, font: fontR, color: GRAY });
  y -= 75;

  // ─── Articles table ────────────────────────────────────────────────────────
  if (order.lines.length > 0) {
    const colD = M, colQ = M + CW * 0.56, colU = M + CW * 0.70, colT = M + CW * 0.87;

    page.drawRectangle({ x: M, y: y - 18, width: CW, height: 20, color: BLUE });
    for (const [label, x] of [["Article / Description", colD + 4], ["Qté", colQ], ["P.U.", colU], ["Total", colT]] as const) {
      text(label, { x, y: y - 12, size: 8, font: fontB, color: rgb(1, 1, 1) });
    }
    y -= 22;

    for (let i = 0; i < order.lines.length && y > 160; i++) {
      const line = order.lines[i];
      const desc = line.description ?? line.article?.name ?? "—";
      const displayDesc = desc.length > 50 ? desc.substring(0, 50) + "…" : desc;
      if (i % 2 === 1) page.drawRectangle({ x: M, y: y - 15, width: CW, height: 17, color: rgb(0.97, 0.97, 0.97) });
      text(displayDesc, { x: colD + 4, y: y - 10, size: 8, font: fontR, color: DARK });
      text(String(line.quantity), { x: colQ, y: y - 10, size: 8, font: fontR, color: DARK });
      text(fmt(Number(line.unitPrice)), { x: colU, y: y - 10, size: 8, font: fontR, color: DARK });
      text(fmt(Number(line.lineTotal)), { x: colT, y: y - 10, size: 8, font: fontB, color: DARK });
      y -= 18;
    }
    page.drawRectangle({ x: M, y: y, width: CW, height: 1, color: BLUE });
    y -= 14;
  }

  // ─── Payment details ───────────────────────────────────────────────────────
  const tX = M + CW - 230;
  const vX = M + CW - 5;

  const drawRow = (label: string, value: string, bold = false, color = DARK) => {
    text(label, { x: tX, y, size: 9, font: bold ? fontB : fontR, color: GRAY });
    text(value, { x: vX, y, size: 9, font: bold ? fontB : fontR, color });
    y -= 14;
  };

  text("DÉTAIL DU PAIEMENT", { x: M, y, size: 9, font: fontB, color: DARK });
  drawRow("Type de paiement:", PAYMENT_TYPE_LABELS[payment.paymentType] ?? payment.paymentType);
  drawRow("Méthode:", PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod);
  if (payment.paymentReference) drawRow("Référence:", payment.paymentReference);
  if (payment.label) drawRow("Libellé:", payment.label);

  y -= 4;
  page.drawRectangle({ x: tX, y: y + 10, width: 230, height: 0.75, color: LGRAY });
  y -= 4;

  drawRow("Déjà payé avant:", fmt(paidBefore, sym));

  // Blue box for main payment amount
  page.drawRectangle({ x: tX - 4, y: y - 18, width: 238, height: 26, color: BLUE });
  text("CE PAIEMENT:", { x: tX, y: y - 10, size: 10, font: fontB, color: rgb(1, 1, 1) });
  text(fmt(thisAmount, sym), { x: vX - 70, y: y - 10, size: 10, font: fontB, color: rgb(1, 1, 1) });
  y -= 30;

  page.drawRectangle({ x: tX, y: y + 10, width: 230, height: 0.75, color: LGRAY });
  y -= 4;

  const remColor = remaining > 0 ? ORANGE : GREEN;
  text("RESTE DÛ:", { x: tX, y, size: 10, font: fontB, color: DARK });
  text(fmt(remaining, sym), { x: vX - 60, y, size: 11, font: fontB, color: remColor });
  y -= 30;

  // ─── Footer ────────────────────────────────────────────────────────────────
  page.drawRectangle({ x: M, y: 38, width: CW, height: 0.75, color: LGRAY });
  text(`${companyName} · Merci pour votre confiance`, {
    x: M, y: 24, size: 8, font: fontR, color: GRAY,
  });
  text(`Reçu généré le ${fmtDate(new Date())} à ${fmtTime(new Date())}`, {
    x: M + CW - 160, y: 24, size: 8, font: fontR, color: GRAY,
  });

  const pdfBytes = await pdfDoc.save();
  const buffer = Buffer.from(pdfBytes);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${payment.receiptNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
  } catch (err) {
    console.error("[receipt/route] PDF generation error:", err);
    console.error((err as Error)?.stack);
    return NextResponse.json(
      { error: "Erreur lors de la génération du reçu", detail: String(err) },
      { status: 500 },
    );
  }
}
