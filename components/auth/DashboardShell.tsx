"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthGuard, RoleGuard } from "./AuthGuard";

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminZone = pathname.startsWith("/admin");
  const isStaffZone = pathname.startsWith("/staff");

  return (
    <AuthGuard>
      <RoleGuard
        allowedRoles={["admin"]}
        enforce={isAdminZone}
        redirectTo="/staff"
      >
        <RoleGuard
          allowedRoles={["staff", "admin"]}
          enforce={isStaffZone}
          redirectTo="/dashboard"
        >
          <div className="relative min-h-screen overflow-x-clip bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),transparent_22%),linear-gradient(180deg,rgba(248,250,252,1),rgba(232,240,249,1))] text-slate-900">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(15,23,42,0.06),transparent)]" />
            <div className="relative">{children}</div>
          </div>
        </RoleGuard>
      </RoleGuard>
    </AuthGuard>
  );
}
