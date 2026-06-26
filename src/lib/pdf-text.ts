import { rgb, type Color, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * pdf-lib's StandardFonts (Helvetica/HelveticaBold) are encoded with WinAnsi
 * (Windows-1252), which does not cover all of Unicode. Two real-world sources
 * of unsupported characters:
 *  - `Number.prototype.toLocaleString("fr-FR")` uses U+202F (narrow no-break
 *    space) as the thousands separator on modern ICU (Node 18+), not a plain
 *    space — this hits every amount >= 1000.
 *  - Free-text fields (client name/address/notes, order descriptions) can
 *    contain emoji or other non-Latin characters typed/pasted by users.
 * `page.drawText()` throws synchronously on the first unsupported character,
 * which previously crashed the whole route. Route through `safeDrawText`
 * instead of `page.drawText` for any dynamic string.
 */
const WINANSI_REPLACEMENTS: Record<string, string> = {
  " ": " ",
  " ": " ",
  "‘": "'",
  "’": "'",
  "‚": "'",
  "“": '"',
  "”": '"',
  "–": "-",
  "—": "-",
  "…": "...",
};

export function sanitizeForPdf(value: unknown): string {
  const text = String(value ?? "");
  let out = "";
  for (const char of text) {
    out += WINANSI_REPLACEMENTS[char] ?? char;
  }
  return out;
}

export function hexToRgbColor(hex: string | null | undefined): Color {
  const normalized = (hex ?? "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return rgb(0.13, 0.4, 0.87);

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

export function safeDrawText(
  page: PDFPage,
  text: string,
  options: Parameters<PDFPage["drawText"]>[1],
) {
  const sanitized = sanitizeForPdf(text);
  try {
    page.drawText(sanitized, options);
  } catch {
    // Last-resort fallback: any character pdf-lib's WinAnsi encoder still
    // rejects gets replaced rather than crashing the PDF generation.
    page.drawText(sanitized.replace(/[^\x20-\x7e]/g, "?"), options);
  }
}

interface TrackedTextOptions {
  font: PDFFont;
  size: number;
  color?: Color;
  tracking?: number;
}

/** pdf-lib has no native letter-spacing; this advances each glyph manually. */
export function trackedTextWidth(text: string, font: PDFFont, size: number, tracking = 0): number {
  const sanitized = sanitizeForPdf(text);
  let width = 0;
  for (const char of sanitized) {
    width += font.widthOfTextAtSize(char, size) + tracking;
  }
  return width - tracking;
}

export function drawTrackedText(page: PDFPage, text: string, x: number, y: number, options: TrackedTextOptions) {
  const sanitized = sanitizeForPdf(text);
  let cx = x;
  for (const char of sanitized) {
    safeDrawText(page, char, { x: cx, y, size: options.size, font: options.font, color: options.color });
    cx += options.font.widthOfTextAtSize(char, options.size) + (options.tracking ?? 0);
  }
}

export function drawRightAlignedText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  options: { font: PDFFont; size: number; color?: Color },
) {
  const sanitized = sanitizeForPdf(text);
  const width = options.font.widthOfTextAtSize(sanitized, options.size);
  safeDrawText(page, text, { x: rightX - width, y, size: options.size, font: options.font, color: options.color });
}

export function drawTrackedRightAlignedText(page: PDFPage, text: string, rightX: number, y: number, options: TrackedTextOptions) {
  const width = trackedTextWidth(text, options.font, options.size, options.tracking ?? 0);
  drawTrackedText(page, text, rightX - width, y, options);
}
