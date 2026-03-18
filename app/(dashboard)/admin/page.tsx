"use client";

import Link from "next/link";
import { MotionDiv, MotionSection } from "@/components/motion";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useAuth } from "@/providers/auth-provider";

const smoothEase = [0.22, 1, 0.36, 1] as const;

export default function AdminControlCenterPage() {
  const { user } = useAuth();

  return (
    <main className="pb-14 pt-10">
      <MotionSection
        className="section-shell space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: smoothEase }}
      >
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04, ease: smoothEase }}
        >
          <Card>
            <CardHeader>
              <Badge className="w-fit">Admin</Badge>
              <CardTitle>Control center</CardTitle>
              <CardDescription>
                Centralized management for users, taxonomy, and moderation strategy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>Signed in as: {user?.fullName ?? "-"}</p>
              <p>Role: {user?.role ?? "-"}</p>
            </CardContent>
          </Card>
        </MotionDiv>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User management</CardTitle>
              <CardDescription>Admin-only user oversight and account governance.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin/users"
                className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Open users
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Taxonomy governance</CardTitle>
              <CardDescription>
                Category and tag lifecycle with staff/admin collaboration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin/taxonomy"
                className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Open taxonomy
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Staff operations</CardTitle>
              <CardDescription>
                Enter staff workspace for moderation queue execution.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/staff"
                className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Open staff workspace
              </Link>
            </CardContent>
          </Card>
        </div>
      </MotionSection>
    </main>
  );
}
