import { ProtectedLayout } from "@/components/layout/protected-layout";

// No parent ModuleGuard — each sub-section has its own layout with its own guard.
export default function FournituresLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
