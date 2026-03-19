"use client";

import Link from "next/link";
import { MotionDiv, MotionSection } from "@/components/motion";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { useAuth } from "@/providers/auth-provider";

const smoothEase = [0.22, 1, 0.36, 1] as const;

export default function AdminControlCenterPage() {
  const { user } = useAuth();

  return (
    <main className="overflow-x-clip pb-16">
      <section className="page-bleed border-b border-cyan-200/70 bg-[linear-gradient(135deg,#f9fdff_0%,#e6f6ff_52%,#fff6d4_100%)] text-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.16),transparent_24%)]" />
        <MotionSection
          className="page-hero-shell grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: smoothEase }}
        >
          <MotionDiv
            className="space-y-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.04, ease: smoothEase }}
          >
            <Badge className="w-fit border border-cyan-200/80 bg-white/80 text-slate-800">Admin</Badge>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Control center for users, taxonomy, wallet actions, and staff workflows
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
                The admin surface keeps the operating links in a full-width command area while the working
                panels stay centered and readable below.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/admin/users"
                className="rounded-full border border-cyan-200/80 bg-white/80 px-4 py-2 font-semibold text-slate-800 transition hover:bg-cyan-100/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Open users
              </Link>
              <Link
                href="/admin/wallet"
                className="rounded-full border border-cyan-200/80 bg-white/80 px-4 py-2 font-semibold text-slate-800 transition hover:bg-cyan-100/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Wallet tools
              </Link>
              <Link
                href="/admin/taxonomy"
                className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 font-semibold text-cyan-800 transition hover:bg-cyan-300/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Taxonomy
              </Link>
              <Link
                href="/staff"
                className="rounded-full border border-amber-300/35 bg-amber-300/10 px-4 py-2 font-semibold text-amber-50 transition hover:bg-amber-300/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Staff workspace
              </Link>
            </div>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.42, delay: 0.08, ease: smoothEase }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Signed in</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{user?.fullName || "-"}</p>
              </div>
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Role</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{user?.role || "-"}</p>
              </div>
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Surface</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">Full-bleed + constrained</p>
              </div>
            </div>
          </MotionDiv>
        </MotionSection>
      </section>

      <section className="content-shell page-stack py-10">
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04, ease: smoothEase }}
        >
          <Card className="surface-card">
            <CardHeader>
              <CardTitle>Admin control center</CardTitle>
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
          <Card className="surface-card">
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

          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-lg">Wallet adjustments</CardTitle>
              <CardDescription>
                Manually credit or debit a user wallet and keep an audit trail for support actions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/admin/wallet"
                className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Open wallet tools
              </Link>
            </CardContent>
          </Card>

          <Card className="surface-card">
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

          <Card className="surface-card">
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
      </section>
    </main>
  );
}
