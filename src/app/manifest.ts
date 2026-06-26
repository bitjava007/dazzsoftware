import type { MetadataRoute } from "next";
import { getBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await getBranding();

  return {
    name: branding.appName,
    short_name: branding.appName,
    description: branding.slogan || "Système de gestion pour atelier de couture",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: branding.primaryColor,
    icons: branding.favicon
      ? [{ src: branding.favicon, sizes: "192x192", type: "image/png" }]
      : [],
  };
}
