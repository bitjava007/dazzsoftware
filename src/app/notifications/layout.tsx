import { ProtectedLayout } from "@/components/layout/protected-layout";

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
