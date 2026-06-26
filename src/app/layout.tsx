import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui/toaster";
import { getBranding, hexToHslTriplet } from "@/lib/branding";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  const description = branding.slogan || "Système de gestion pour atelier de couture";

  return {
    title: branding.appName,
    description,
    icons: branding.favicon ? { icon: branding.favicon } : undefined,
    openGraph: {
      title: branding.appName,
      description,
      images: branding.logo ? [branding.logo] : undefined,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [messages, branding] = await Promise.all([getMessages(), getBranding()]);

  const themeVars = `:root {
    --primary: ${hexToHslTriplet(branding.primaryColor)};
    --ring: ${hexToHslTriplet(branding.primaryColor)};
    --secondary: ${hexToHslTriplet(branding.secondaryColor)};
    --sidebar-background: ${hexToHslTriplet(branding.sidebarColor)};
    --sidebar-primary: ${hexToHslTriplet(branding.buttonColor)};
  }`;

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <style id="branding-theme" dangerouslySetInnerHTML={{ __html: themeVars }} />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
