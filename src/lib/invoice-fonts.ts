import fs from "fs";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont } from "pdf-lib";
import { woffToSfnt } from "@/lib/woff-to-sfnt";

const FONTS_DIR = path.join(process.cwd(), "public/fonts/invoice");

// pdf-lib only computes glyph widths/ToUnicode entries for glyphs reachable
// via a direct codepoint→glyph cmap lookup. Ligatures and contextual
// alternates (e.g. "fi" in Cormorant Garamond Italic) are resolved through
// GSUB substitution to a glyph with no such direct mapping, so pdf-lib
// silently omits them from the PDF's /W array — the glyph still draws via
// its CID, but with no declared width, which renders as a wide blank gap.
// Disabling substitution features keeps every drawn glyph on the directly
// reachable (and therefore correctly measured) path.
const NO_SUBSTITUTION_FEATURES = {
  liga: false,
  dlig: false,
  clig: false,
  hlig: false,
  calt: false,
  rlig: false,
} as const;

export interface InvoiceFonts {
  serifBold: PDFFont;
  serifItalic: PDFFont;
  sansRegular: PDFFont;
  sansMedium: PDFFont;
  sansBold: PDFFont;
}

/** Embeds the Cormorant Garamond / Inter font set for the invoice PDF. */
export async function loadInvoiceFonts(pdfDoc: PDFDocument): Promise<InvoiceFonts> {
  pdfDoc.registerFontkit(fontkit);

  const embed = (file: string) =>
    pdfDoc.embedFont(woffToSfnt(fs.readFileSync(path.join(FONTS_DIR, file))), {
      features: NO_SUBSTITUTION_FEATURES,
    });

  const [serifBold, serifItalic, sansRegular, sansMedium, sansBold] = await Promise.all([
    embed("CormorantGaramond-SemiBold.woff"),
    embed("CormorantGaramond-MediumItalic.woff"),
    embed("Inter-Regular.woff"),
    embed("Inter-Medium.woff"),
    embed("Inter-SemiBold.woff"),
  ]);

  return { serifBold, serifItalic, sansRegular, sansMedium, sansBold };
}
