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
        <div className="min-h-screen bg-slate-50">{children}</div>
      </RoleGuard>
      </RoleGuard>
    </AuthGuard>
  );
}
