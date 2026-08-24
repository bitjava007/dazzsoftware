import type { MetadataRoute } from "next";
import { getBranding } from "@/lib/branding";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await getBranding();

  // Derive a short name: first word of appName, capped at 12 chars
  const shortName = branding.appName.split(" ")[0].slice(0, 12);

  return {
    name: branding.appName,
    short_name: shortName,
    description: branding.slogan ?? branding.companyName,
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: branding.sidebarColor,
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
