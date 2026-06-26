import { rgb, type Color, type PDFDocument, type PDFPage } from "pdf-lib";
import { drawRightAlignedText, drawTrackedText } from "@/lib/pdf-text";
import type { InvoiceFonts } from "@/lib/invoice-fonts";

const hex = (h: string): Color => {
  const n = h.replace("#", "");
  return rgb(
    parseInt(n.slice(0, 2), 16) / 255,
    parseInt(n.slice(2, 4), 16) / 255,
    parseInt(n.slice(4, 6), 16) / 255,
  );
};

// Shared luxury palette for the invoice and receipt PDFs — keep both
// documents visually identical by drawing from this single source.
export const INK = hex("#1c1b22");
export const SECONDARY = hex("#8a8794");
export const RULE = hex("#e9e6e0");
export const GOLD = hex("#b08d57");
export const ACCENT_BG = hex("#f6efe4");
export const TOTAL_BAND = hex("#2a2530");
export const DUE = hex("#b0512f");
export const RECEIVED = hex("#3f7d5c");
export const WHITE = rgb(1, 1, 1);
export const CREAM = hex("#f1ece2");

interface BrandSettings {
  logo?: string | null;
  companyName?: string | null;
  slogan?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxNumber?: string | null;
}

/** Logo + brand name/slogan (left) and contact lines (right). Returns the new y. */
export async function drawBrandHeader(
  pdfDoc: PDFDocument,
  page: PDFPage,
  settings: BrandSettings | null | undefined,
  fonts: Pick<InvoiceFonts, "serifBold" | "serifItalic" | "sansRegular">,
  marginX: number,
  rightEdge: number,
  topY: number,
): Promise<number> {
  const LOGO_BOX = 46;
  let brandX = marginX;
  const logoUrl = settings?.logo;
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
          const { width: iW, height: iH } = img.scale(1);
          const scale = Math.min(LOGO_BOX / iW, LOGO_BOX / iH);
          const dW = iW * scale, dH = iH * scale;
          page.drawImage(img, {
            x: marginX + (LOGO_BOX - dW) / 2,
            y: topY - LOGO_BOX + (LOGO_BOX - dH) / 2,
            width: dW,
            height: dH,
          });
          brandX = marginX + LOGO_BOX + 14;
        }
      }
    } catch (logoErr) {
      console.error("[invoice-pdf-theme] logo fetch/embed failed (non-fatal):", logoErr);
    }
  }

  const companyName = settings?.companyName ?? "DazzUrembo App";
  const slogan = settings?.slogan || "Where African heritage meets modern elegance";
  drawTrackedText(page, companyName.toUpperCase(), brandX, topY - 16, { font: fonts.serifBold, size: 18, color: INK, tracking: 1.2 });
  page.drawText(slogan, { x: brandX, y: topY - 33, size: 9.5, font: fonts.serifItalic, color: GOLD });

  const contactLines = [
    settings?.address,
    settings?.phone,
    settings?.email,
    settings?.website,
    settings?.taxNumber ? `N° Fiscal: ${settings.taxNumber}` : null,
  ].filter(Boolean) as string[];
  let cy = topY - 6;
  for (const line of contactLines) {
    drawRightAlignedText(page, line, rightEdge, cy, { font: fonts.sansRegular, size: 9, color: SECONDARY });
    cy -= 12.5;
  }

  return topY - 56;
}

/** The thin gold gradient rule separating the header from the document body. */
export function drawGoldGradientRule(page: PDFPage, marginX: number, colWidth: number, y: number): void {
  const steps = 80;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const edge = Math.min(t, 1 - t) * 2.4;
    const a = Math.min(1, edge);
    const r = 1 - a * (1 - 0.69);
    const g = 1 - a * (1 - 0.55);
    const b = 1 - a * (1 - 0.34);
    page.drawRectangle({ x: marginX + (colWidth / steps) * i, y: y - 1, width: colWidth / steps + 0.5, height: 1.6, color: rgb(r, g, b) });
  }
}
