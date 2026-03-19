"use client";

import { RoleGuard } from "@/components/auth/AuthGuard";
import { TaxonomySection } from "@/components/admin/taxonomy/taxonomy-section";

export default function AdminTaxonomyPage() {
  return (
    <RoleGuard allowedRoles={["staff", "admin"]} redirectTo="/admin">
      <TaxonomySection />
    </RoleGuard>
  );
}
