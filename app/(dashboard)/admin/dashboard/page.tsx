"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select } from "@/components/ui";
import {
  getAdminRevenue,
  getAdminStats,
  getAdminUsersGrowth,
} from "@/lib/api/admin";
import type {
  AdminStats,
  AggregationGroupBy,
  RevenueSeriesResponse,
  UsersGrowthSeriesResponse,
} from "@/lib/types";

const GROUP_BY_OPTIONS: AggregationGroupBy[] = ["day", "week", "month"];

function defaultFromDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

function defaultToDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminDashboardAnalyticsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueSeriesResponse | null>(null);
  const [usersGrowth, setUsersGrowth] = useState<UsersGrowthSeriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [from, setFrom] = useState(defaultFromDate());
  const [to, setTo] = useState(defaultToDate());
  const [groupBy, setGroupBy] = useState<AggregationGroupBy>("day");

  const loadDashboard = useCallback(async () => {
    const [statsResult, revenueResult, usersGrowthResult] = await Promise.all([
      getAdminStats(),
      getAdminRevenue({ from, to, groupBy }),
      getAdminUsersGrowth({ from, to, groupBy }),
    ]);

    setStats(statsResult);
    setRevenue(revenueResult);
    setUsersGrowth(usersGrowthResult);
  }, [from, groupBy, to]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        await loadDashboard();
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load admin dashboard");
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
  }, [loadDashboard]);

  async function handleApplyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply filters");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="pb-14 pt-10">
      <section className="section-shell space-y-6">
        <Card>
          <CardHeader>
            <Badge className="w-fit">Admin analytics</Badge>
            <CardTitle>Dashboard metrics</CardTitle>
            <CardDescription>
              Stats, revenue trend, and user growth trend from admin dashboard APIs.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Query range</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-4" onSubmit={handleApplyRange}>
              <div className="space-y-1.5">
                <Label htmlFor="from">From</Label>
                <Input id="from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="to">To</Label>
                <Input id="to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="groupBy">Group by</Label>
                <Select
                  id="groupBy"
                  value={groupBy}
                  onChange={(event) => setGroupBy(event.target.value as AggregationGroupBy)}
                >
                  {GROUP_BY_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" loading={loading}>
                  Apply
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-[var(--danger)] bg-[var(--danger-soft)]">
            <CardContent className="p-4 text-sm text-[var(--danger)]">{error}</CardContent>
          </Card>
        ) : null}

        {stats ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Total: {stats.users.total}</p>
                <p>Active: {stats.users.active}</p>
                <p>By role: {JSON.stringify(stats.users.byRole)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Posts total: {stats.content.postsTotal}</p>
                <p>Posts pending: {stats.content.postsPending}</p>
                <p>Products active: {stats.content.productsActive}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Commerce</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Orders: {stats.commerce.ordersTotal}</p>
                <p>Tracked revenue orders: {stats.commerce.revenueTrackedOrders}</p>
                <p>Deposits completed: {stats.commerce.depositsCompleted}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Tickets total: {stats.support.ticketsTotal}</p>
                <p>Tickets open: {stats.support.ticketsOpen}</p>
                <p>Generated at: {new Date(stats.generatedAt).toLocaleString()}</p>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {revenue ? (
          <Card>
            <CardHeader>
              <CardTitle>Revenue series</CardTitle>
              <CardDescription>
                Total revenue: {revenue.totalRevenue} | Orders: {revenue.totalOrders}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--text-secondary)]">
                    <th className="py-2 pr-3">Period</th>
                    <th className="py-2 pr-3">Revenue</th>
                    <th className="py-2 pr-3">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.series.map((item) => (
                    <tr key={item.period} className="border-t border-[var(--border)]">
                      <td className="py-2 pr-3">{item.period}</td>
                      <td className="py-2 pr-3">{item.revenue}</td>
                      <td className="py-2 pr-3">{item.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : null}

        {usersGrowth ? (
          <Card>
            <CardHeader>
              <CardTitle>Users growth series</CardTitle>
              <CardDescription>Base count: {usersGrowth.baseCount}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--text-secondary)]">
                    <th className="py-2 pr-3">Period</th>
                    <th className="py-2 pr-3">New users</th>
                    <th className="py-2 pr-3">Total users</th>
                  </tr>
                </thead>
                <tbody>
                  {usersGrowth.series.map((item) => (
                    <tr key={item.period} className="border-t border-[var(--border)]">
                      <td className="py-2 pr-3">{item.period}</td>
                      <td className="py-2 pr-3">{item.newUsers}</td>
                      <td className="py-2 pr-3">{item.totalUsers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  );
}

