import { getBranding } from "@/lib/branding";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function ConnexionPage() {
  const branding = await getBranding();
  return <LoginForm branding={branding} />;
}
