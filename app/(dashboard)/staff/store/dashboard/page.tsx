"use client";

import { useEffect, useState } from "react";
import { StaffStoreNav } from "@/components/common/staff-store-nav";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { getStoreDashboardSummary } from "@/lib/api/store-management";
import type { StoreDashboardSummary } from "@/lib/types";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function StaffStoreDashboardPage() {
  const [summary, setSummary] = useState<StoreDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await getStoreDashboardSummary();
        if (active) {
          setSummary(result);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load store dashboard");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="pb-14 pt-10">
      <section className="section-shell space-y-6">
        <Card>
          <CardHeader>
            <Badge className="w-fit">Store Ops</Badge>
            <CardTitle>Store dashboard</CardTitle>
            <CardDescription>
              Real-time operational snapshot for staff/admin store workflows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StaffStoreNav />
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-[var(--danger)] bg-[var(--danger-soft)]">
            <CardContent className="p-4 text-sm text-[var(--danger)]">{error}</CardContent>
          </Card>
        ) : null}

        {loading ? (
          <Card>
            <CardContent className="p-4 text-sm text-[var(--text-secondary)]">Loading dashboard...</CardContent>
          </Card>
        ) : null}

        {!loading && summary ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Total orders</CardDescription>
                <CardTitle className="text-2xl">{summary.totalOrders}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Paid orders</CardDescription>
                <CardTitle className="text-2xl">{summary.paidOrders}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Delivered orders</CardDescription>
                <CardTitle className="text-2xl">{summary.deliveredOrders}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Completed orders</CardDescription>
                <CardTitle className="text-2xl">{summary.completedOrders}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Orders last 7 days</CardDescription>
                <CardTitle className="text-2xl">{summary.ordersLast7Days}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Gross revenue</CardDescription>
                <CardTitle className="text-2xl">{formatMoney(summary.grossRevenue)}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        ) : null}
      </section>
    </main>
  );
}
