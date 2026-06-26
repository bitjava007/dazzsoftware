import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const DEFAULT_APP_NAME = "DazzUrembo App";
export const DEFAULT_COMPANY_NAME = "DazzUrembo App";
export const DEFAULT_PRIMARY_COLOR = "#2563eb";
export const DEFAULT_SECONDARY_COLOR = "#0f172a";
export const DEFAULT_BUTTON_COLOR = "#2563eb";
export const DEFAULT_SIDEBAR_COLOR = "#0f172a";

export interface Branding {
  appName: string;
  companyName: string;
  logo: string | null;
  favicon: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  website: string | null;
  slogan: string | null;
  primaryColor: string;
  secondaryColor: string;
  buttonColor: string;
  sidebarColor: string;
  currencyCode: string | null;
}

const DEFAULT_BRANDING: Branding = {
  appName: DEFAULT_APP_NAME,
  companyName: DEFAULT_COMPANY_NAME,
  logo: null,
  favicon: null,
  address: null,
  city: null,
  country: null,
  phone: null,
  whatsappNumber: null,
  email: null,
  website: null,
  slogan: null,
  primaryColor: DEFAULT_PRIMARY_COLOR,
  secondaryColor: DEFAULT_SECONDARY_COLOR,
  buttonColor: DEFAULT_BUTTON_COLOR,
  sidebarColor: DEFAULT_SIDEBAR_COLOR,
  currencyCode: null,
};

// React request memoization — avoids redundant DB calls within one render.
export const getBranding = cache(async (): Promise<Branding> => {
  try {
    const settings = await prisma.settings.findFirst({
      include: { defaultCurrency: true },
    });
    if (!settings) return DEFAULT_BRANDING;

    return {
      appName: settings.appName || DEFAULT_APP_NAME,
      companyName: settings.companyName || DEFAULT_COMPANY_NAME,
      logo: settings.logo,
      favicon: settings.favicon,
      address: settings.address,
      city: settings.city,
      country: settings.country,
      phone: settings.phone,
      whatsappNumber: settings.whatsappNumber,
      email: settings.email,
      website: settings.website,
      slogan: settings.slogan,
      primaryColor: settings.primaryColor || DEFAULT_PRIMARY_COLOR,
      secondaryColor: settings.secondaryColor || DEFAULT_SECONDARY_COLOR,
      buttonColor: settings.buttonColor || DEFAULT_BUTTON_COLOR,
      sidebarColor: settings.sidebarColor || DEFAULT_SIDEBAR_COLOR,
      currencyCode: settings.defaultCurrency?.code ?? null,
    };
  } catch (err) {
    console.error("[getBranding] failed to load settings, using defaults:", err);
    return DEFAULT_BRANDING;
  }
});

export function hexToHslTriplet(hex: string): string {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return "221.2 83.2% 53.3%";

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;

  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return `${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}
