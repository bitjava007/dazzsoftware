import { ImageResponse } from "next/og";
import { getBranding } from "@/lib/branding";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
// Prisma requires Node.js runtime (not Edge)
export const runtime = "nodejs";

export default async function AppleIcon() {
  const branding = await getBranding();
  const bg = branding.sidebarColor ?? "#18181b";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bg,
        }}
      >
        {branding.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.logo}
            alt=""
            width={144}
            height={144}
            style={{ objectFit: "contain" }}
          />
        ) : (
          <span style={{ color: "white", fontSize: 96, fontWeight: 700, fontFamily: "sans-serif" }}>
            D
          </span>
        )}
      </div>
    ),
    { width: 180, height: 180 },
  );
}
