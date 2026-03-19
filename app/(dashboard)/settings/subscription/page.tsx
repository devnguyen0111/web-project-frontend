"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { MotionDiv, MotionSection } from "@/components/motion";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  Spinner,
} from "@/components/ui";
import {
  getMySubscription,
  listMySubscriptionHistory,
  renewMySubscription,
  setSubscriptionAutoRenew,
  setSubscriptionCancelAtPeriodEnd,
} from "@/lib/api/subscriptions";
import { getMyWalletSummary } from "@/lib/api/wallet";
import {
  getMyNotificationUnreadCount,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import type {
  BillingCycle,
  NotificationItem,
  SubscriptionHistoryItem,
  SubscriptionOverview,
  SubscriptionPlanCode,
  WalletSummary,
} from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

const smoothEase = [0.22, 1, 0.36, 1] as const;
const COIN_TO_VND_RATE = 1000;

function toCoinFromStoredVnd(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return value / COIN_TO_VND_RATE;
}

function formatCoins(value?: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(value ?? 0) ? 0 : 2,
  }).format(value ?? 0);
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function buildIdempotencyKey(planCode: string, billingCycle: BillingCycle) {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  return `subscription:settings:${planCode}:${billingCycle}:${suffix}`;
}

function resolveItemId(item: { id?: string; _id?: string }) {
  return item.id || item._id || "";
}

export default function SubscriptionSettingsPage() {
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [history, setHistory] = useState<SubscriptionHistoryItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedPlanCode, setSelectedPlanCode] = useState<SubscriptionPlanCode>("pro");
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>("monthly");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const walletBalanceCoins = useMemo(() => toCoinFromStoredVnd(wallet?.balance), [wallet?.balance]);

  async function loadAll() {
    const [overviewData, walletData, historyData, notificationsData, unreadData] = await Promise.all([
      getMySubscription(),
      getMyWalletSummary(),
      listMySubscriptionHistory({ page: 1, limit: 10 }),
      listMyNotifications({ page: 1, limit: 8 }),
      getMyNotificationUnreadCount(),
    ]);

    setOverview(overviewData);
    setWallet(walletData);
    setHistory(historyData.data);
    setNotifications(notificationsData.data);
    setUnreadCount(unreadData.unreadCount);
    setSelectedPlanCode(overviewData.subscription.planCode);
    setSelectedCycle(overviewData.subscription.billingCycle ?? "monthly");
  }

  useEffect(() => {
    let active = true;

    void (async () => {
      setLoading(true);
      setError("");
      try {
        await loadAll();
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load subscription settings");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const selectedPlan = useMemo(() => {
    return overview?.plans.find((plan) => plan.code === selectedPlanCode) ?? null;
  }, [overview?.plans, selectedPlanCode]);

  const estimatedCost = useMemo(() => {
    if (!selectedPlan) return 0;
    return selectedPlan.cyclePricing[selectedCycle]?.cyclePriceCoins ?? selectedPlan.monthlyPriceCoins;
  }, [selectedCycle, selectedPlan]);

  async function handlePurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPlan) return;

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const result = await renewMySubscription({
        planCode: selectedPlan.code,
        billingCycle: selectedCycle,
        idempotencyKey: buildIdempotencyKey(selectedPlan.code, selectedCycle),
      });
      setOverview(result);
      const walletData = await getMyWalletSummary();
      setWallet(walletData);
      const historyData = await listMySubscriptionHistory({ page: 1, limit: 10 });
      setHistory(historyData.data);
      await refreshProfile();
      setMessage(`${result.subscription.planName} updated successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscription update failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleAutoRenew() {
    if (!overview) return;
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const result = await setSubscriptionAutoRenew(!overview.subscription.autoRenew);
      setOverview(result);
      await refreshProfile();
      setMessage(`Auto-renew ${result.subscription.autoRenew ? "enabled" : "disabled"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update auto-renew");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleCancelAtPeriodEnd() {
    if (!overview) return;
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const nextValue = !overview.subscription.cancelAtPeriodEnd;
      const result = await setSubscriptionCancelAtPeriodEnd(nextValue);
      setOverview(result);
      await refreshProfile();
      setMessage(nextValue ? "Subscription will cancel at period end." : "Cancel-at-period-end disabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update cancel-at-period-end");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      const [notificationsData, unreadData] = await Promise.all([
        listMyNotifications({ page: 1, limit: 8 }),
        getMyNotificationUnreadCount(),
      ]);
      setNotifications(notificationsData.data);
      setUnreadCount(unreadData.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark notifications");
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await markNotificationRead(id);
      const [notificationsData, unreadData] = await Promise.all([
        listMyNotifications({ page: 1, limit: 8 }),
        getMyNotificationUnreadCount(),
      ]);
      setNotifications(notificationsData.data);
      setUnreadCount(unreadData.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark notification");
    }
  }

  return (
    <main className="overflow-x-clip pb-16">
      <section className="page-bleed border-b border-cyan-200/70 bg-[linear-gradient(135deg,#f9fdff_0%,#e6f6ff_52%,#fff6d4_100%)] text-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.18),transparent_24%)]" />
        <MotionSection
          className="page-hero-shell grid gap-8 lg:grid-cols-[1.06fr_0.94fr] lg:items-center"
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
            <Badge className="mb-1 w-fit border border-cyan-200/80 bg-white/80 text-slate-800">
              Settings
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Subscription management in a full-bleed shell, with actions kept centered and legible
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
                Review plan state, wallet-aware renewals, notifications, and billing history without losing
                the separation between navigation chrome and functional content.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/subscription">
                <Button className="bg-white text-slate-950 hover:bg-slate-100">View plans</Button>
              </Link>
              <Link href="/dashboard/wallet">
                <Button variant="outline" className="border-cyan-200/80 bg-white/85 text-slate-800 hover:bg-cyan-100/70">
                  Wallet
                </Button>
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
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Plan</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {overview?.subscription.planName ?? "Loading..."}
                </p>
              </div>
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Wallet</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatCoins(walletBalanceCoins)} coin</p>
              </div>
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Unread</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{unreadCount}</p>
              </div>
            </div>
          </MotionDiv>
        </MotionSection>
      </section>

      <section className="content-shell page-stack py-10">
        <MotionSection
        className="page-stack"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: smoothEase }}
      >
        <Card className="overflow-hidden border-amber-200 bg-[linear-gradient(155deg,rgba(255,251,235,1),rgba(255,255,255,1))]">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge className="mb-3 w-fit bg-cyan-600 text-white hover:bg-cyan-500">
                  Settings
                </Badge>
                <CardTitle>Subscription management</CardTitle>
                <CardDescription>
                  Current plan, auto-renew controls, wallet-aware renew/upgrade, history and alerts.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Link href="/subscription">
                  <Button variant="outline">View plans</Button>
                </Link>
                <Link href="/dashboard/wallet">
                  <Button>Wallet</Button>
                </Link>
              </div>
            </div>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Loading subscription settings" />
          </div>
        ) : null}

        {error ? (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : null}

        {message ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-4 text-sm text-emerald-700">{message}</CardContent>
          </Card>
        ) : null}

        {overview ? (
          <>
            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <MotionDiv
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.3, ease: smoothEase }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Current plan summary</CardTitle>
                    <CardDescription>Live state from subscription service</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Plan</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{overview.subscription.planName}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Cycle</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{overview.subscription.billingCycle}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Status</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{overview.subscription.status}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Current period</p>
                        <p className="mt-1 text-slate-800">
                          {formatDate(overview.subscription.currentPeriodStart)} - {formatDate(overview.subscription.currentPeriodEnd)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Subscription validity</p>
                        <p className="mt-1 text-slate-800">
                          {formatDate(overview.subscription.startedAt)} - {formatDate(overview.subscription.expiresAt)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Allowed posts</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-950">{overview.quota.allowedPosts}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Used</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-950">{overview.quota.usedPosts}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-xs uppercase tracking-[0.1em] text-emerald-700">Remaining</p>
                        <p className="mt-1 text-2xl font-semibold text-emerald-900">{overview.quota.remainingPosts}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </MotionDiv>

              <MotionDiv
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.3, delay: 0.05, ease: smoothEase }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Active perks</CardTitle>
                    <CardDescription>Quota-first enforcement this iteration</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-700">
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      Monthly post quota: {overview.quota.allowedPosts} posts
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      Reward bonus: +{overview.activePerks?.rewardBonusPercent ?? 0}%{" "}
                      <Badge className="ml-2 bg-amber-100 text-amber-800">Coming soon</Badge>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      Store discount: -{overview.activePerks?.storeDiscountPercent ?? 0}%{" "}
                      <Badge className="ml-2 bg-amber-100 text-amber-800">Coming soon</Badge>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      Upload limit: {overview.activePerks?.uploadLimitMb ?? 10}MB{" "}
                      <Badge className="ml-2 bg-amber-100 text-amber-800">Coming soon</Badge>
                    </div>
                  </CardContent>
                </Card>
              </MotionDiv>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>Renew/upgrade and billing controls</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <form className="space-y-4" onSubmit={handlePurchase}>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Plan</label>
                      <Select
                        value={selectedPlanCode}
                        onChange={(event) => setSelectedPlanCode(event.target.value as SubscriptionPlanCode)}
                        disabled={submitting}
                      >
                        {overview.plans.map((plan) => (
                          <option key={plan.code} value={plan.code}>
                            {plan.name} - {plan.monthlyPostLimit} posts/month
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">Billing cycle</p>
                      <div className="flex flex-wrap gap-2">
                        {(["monthly", "quarterly", "yearly"] as BillingCycle[]).map((cycle) => (
                          <button
                            key={cycle}
                            type="button"
                            className={`rounded-full px-4 py-2 text-sm font-semibold ${
                              selectedCycle === cycle
                                ? "bg-cyan-600 text-white"
                                : "border border-slate-300 bg-white text-slate-700"
                            }`}
                            onClick={() => setSelectedCycle(cycle)}
                            disabled={submitting}
                          >
                            {cycle}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <p>Estimated cost: {formatCoins(estimatedCost)} coin</p>
                      <p>Wallet balance: {formatCoins(walletBalanceCoins)} coin</p>
                      <p>
                        {walletBalanceCoins >= estimatedCost
                          ? "Enough balance for checkout."
                          : `Need +${formatCoins(estimatedCost - walletBalanceCoins)} coin.`}
                      </p>
                    </div>

                    <Button type="submit" disabled={submitting || !selectedPlan || walletBalanceCoins < estimatedCost}>
                      {submitting ? "Processing..." : "Confirm renew / upgrade"}
                    </Button>
                  </form>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button variant="outline" onClick={handleToggleAutoRenew} disabled={submitting}>
                      Auto-renew: {overview.subscription.autoRenew ? "ON" : "OFF"}
                    </Button>
                    <Button variant="outline" onClick={handleToggleCancelAtPeriodEnd} disabled={submitting}>
                      Cancel at period end: {overview.subscription.cancelAtPeriodEnd ? "ON" : "OFF"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle>Notifications</CardTitle>
                      <CardDescription>Subscription reminders and renewal events</CardDescription>
                    </div>
                    <Badge>{unreadCount} unread</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" onClick={handleMarkAllRead}>
                    Mark all as read
                  </Button>
                  <div className="space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-slate-500">No notifications yet.</p>
                    ) : (
                      notifications.map((item) => {
                        const itemId = resolveItemId(item);
                        return (
                        <div key={itemId} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-900">{item.title}</p>
                              <p className="text-slate-600">{item.message}</p>
                              <p className="mt-1 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                            </div>
                            {!item.readAt ? (
                              <Button
                                variant="outline"
                                onClick={() => handleMarkRead(itemId)}
                                className="text-xs"
                                disabled={!itemId}
                              >
                                Mark read
                              </Button>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-700">Read</Badge>
                            )}
                          </div>
                        </div>
                      )})
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Subscription history</CardTitle>
                <CardDescription>Derived from wallet subscription transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {history.length === 0 ? (
                    <p className="text-sm text-slate-500">No subscription transaction yet.</p>
                  ) : (
                    history.map((item) => (
                      <div key={resolveItemId(item)} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                        <p className="font-semibold text-slate-900">
                          {String(item.planCode ?? "unknown").toUpperCase()} - {String(item.billingCycle ?? "monthly")}
                        </p>
                        <p className="text-slate-600">
                          Cost: {formatCoins(typeof item.totalCostCoins === "number" ? item.totalCostCoins : toCoinFromStoredVnd(item.amount))} coin
                        </p>
                        <p className="text-slate-500">Status: {item.status}</p>
                        <p className="text-slate-500">Date: {formatDate(item.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </MotionSection>
      </section>
    </main>
  );
}
