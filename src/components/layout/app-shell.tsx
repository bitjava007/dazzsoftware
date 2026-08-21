"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu, Scissors } from "lucide-react";
import type { Branding } from "@/lib/branding";
import type { AppModule } from "@/lib/permissions-shared";

interface AppShellProps {
  children: React.ReactNode;
  branding: Branding;
  visibleModules: AppModule[];
}

export function AppShell({ children, branding, visibleModules }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        branding={branding}
        visibleModules={visibleModules}
      />

      <div className="flex flex-col flex-1 lg:ml-64 min-h-screen overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 h-14 px-4 bg-sidebar border-b border-slate-700 shrink-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-300 hover:text-white p-1.5 rounded-md transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-md shrink-0 overflow-hidden"
              style={{ backgroundColor: branding.logo ? "transparent" : branding.buttonColor }}
            >
              {branding.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logo} alt={branding.appName} className="w-full h-full object-contain" />
              ) : (
                <Scissors className="w-4 h-4 text-white" />
              )}
            </div>
            <span className="font-semibold text-white text-sm">{branding.appName}</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
