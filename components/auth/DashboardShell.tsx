"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthGuard, RoleGuard } from "./AuthGuard";

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminTicketsZone = pathname.startsWith("/admin/tickets");
  const isAdminZone = pathname.startsWith("/admin") && !isAdminTicketsZone;
  const isStaffZone = pathname.startsWith("/staff") || isAdminTicketsZone;

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
          <div className="min-h-screen bg-[var(--bg)]">{children}</div>
        </RoleGuard>
      </RoleGuard>
    </AuthGuard>
  );
}
