"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthGuard, RoleGuard } from "./AuthGuard";

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminZone = pathname.startsWith("/admin");

  return (
    <AuthGuard>
      <RoleGuard
        allowedRoles={["staff", "admin"]}
        enforce={isAdminZone}
        redirectTo="/dashboard"
      >
        <div className="min-h-screen bg-slate-50">{children}</div>
      </RoleGuard>
    </AuthGuard>
  );
}
