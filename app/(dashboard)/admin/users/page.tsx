"use client";

import { RoleGuard } from "@/components/auth/AuthGuard";
import { AdminUsersSection } from "@/components/admin/users/admin-users-section";

export default function AdminUsersPage() {
  return (
    <RoleGuard allowedRoles={["admin"]} redirectTo="/admin">
      <AdminUsersSection />
    </RoleGuard>
  );
}
