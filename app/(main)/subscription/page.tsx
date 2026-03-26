"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MotionDiv, MotionSection } from "@/components/motion";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Spinner,
} from "@/components/ui";
import { getMySubscription, listSubscriptionPlans, renewMySubscription } from "@/lib/api/subscriptions";
import { getMyWalletSummary } from "@/lib/api/wallet";
import type {
  BillingCycle,
  SubscriptionOverview,
  SubscriptionPlan,
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

function buildIdempotencyKey(planCode: string, billingCycle: BillingCycle) {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;

  return `subscription:purchase:${planCode}:${billingCycle}:${suffix}`;
}

function planSortValue(planCode: string) {
  if (planCode === "free") return 0;
  if (planCode === "pro") return 1;
  if (planCode === "vip") return 2;
  return 999;
}

type PurchaseState = {
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
} | null;

export default function SubscriptionMarketingPage() {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [purchaseState, setPurchaseState] = useState<PurchaseState>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      setLoading(true);
      setError("");

      try {
        const plansData = await listSubscriptionPlans();
        if (!active) return;

        const sortedPlans = plansData.sort((left, right) => {
          return planSortValue(left.code) - planSortValue(right.code);
        });
        setPlans(sortedPlans);

        if (user) {
          const [overviewData, walletData] = await Promise.all([
            getMySubscription(),
            getMyWalletSummary(),
          ]);
          if (!active) return;

          setOverview(overviewData);
          setWallet(walletData);
          setBillingCycle(overviewData.subscription.billingCycle ?? "monthly");
        } else {
          setOverview(null);
          setWallet(null);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load subscription page");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  const walletBalanceCoins = useMemo(() => {
    return toCoinFromStoredVnd(wallet?.balance);
  }, [wallet?.balance]);

  const featureRows = [
    { label: "Bonus coin reward", key: "rewardBonusPercent" as const, suffix: "%" },
    { label: "Store discount", key: "storeDiscountPercent" as const, suffix: "%" },
    { label: "Priority support", key: "prioritySupport" as const },
    { label: "Exclusive access", key: "exclusiveAccess" as const },
    { label: "Profile badge", key: "profileBadge" as const },
    { label: "Upload limit", key: "uploadLimitMb" as const, suffix: "MB" },
  ];

  const currentPlanCode = overview?.subscription.planCode;

  function getCyclePriceCoins(plan: SubscriptionPlan) {
    const cycle = plan.cyclePricing?.[billingCycle];
    if (!cycle) {
      return plan.monthlyPriceCoins;
    }

    return cycle.cyclePriceCoins;
  }

  function getCta(plan: SubscriptionPlan) {
    if (!user) {
      return { label: "Login to upgrade", action: "login" as const, disabled: false };
    }

    if (currentPlanCode === plan.code) {
      return { label: "Current plan", action: "current" as const, disabled: true };
    }

    if (currentPlanCode === "vip" && (plan.code === "free" || plan.code === "pro")) {
      return { label: "Manage in settings", action: "manage" as const, disabled: false };
    }

    const priceCoins = getCyclePriceCoins(plan);
    if (priceCoins <= walletBalanceCoins) {
      return { label: "Buy with coins", action: "purchase" as const, disabled: false };
    }

    return { label: "Top up coins", action: "topup" as const, disabled: false };
  }

  async function handlePurchaseConfirm() {
    if (!purchaseState) return;

    const plan = purchaseState.plan;
    const cycle = purchaseState.billingCycle;
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const result = await renewMySubscription({
        planCode: plan.code,
        billingCycle: cycle,
        idempotencyKey: buildIdempotencyKey(plan.code, cycle),
      });
      setOverview(result);
      setPlans(result.plans.sort((left, right) => planSortValue(left.code) - planSortValue(right.code)));
      const walletData = await getMyWalletSummary();
      setWallet(walletData);
      await refreshProfile();
      setPurchaseState(null);
      setMessage(`${result.subscription.planName} purchased successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="pb-16 pt-10">
      <MotionSection
        className="section-shell space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: smoothEase }}
      >
        <Card className="overflow-hidden border-cyan-200 bg-gradient-to-br from-cyan-500 via-blue-500 to-teal-500 text-white">
          <CardContent className="grid gap-8 p-8 md:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-4">
              <Badge className="w-fit bg-white/20 text-white">Subscription</Badge>
              <h1 className="text-3xl font-semibold leading-tight md:text-5xl">
                Upgrade your account to unlock more benefits
              </h1>
              <p className="max-w-2xl text-sm text-white/90 md:text-base">
                Earn bonus coin rewards, get store discounts, receive support priority, and enjoy a better ecosystem experience.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  className="bg-white text-slate-900 hover:bg-slate-100"
                  onClick={() => {
                    const target = document.getElementById("plan-section");
                    target?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  View suitable plans
                </Button>
                <Link href={user ? "/settings/subscription" : "/login"}>
                  <Button variant="outline" className="border-white/70 bg-transparent text-white hover:bg-white/10">
                    {user ? "Manage current plan" : "Log in to upgrade"}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/30 bg-white/15 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.14em] text-white/90">Quick value</p>
              <div className="rounded-xl bg-white/85 p-3 text-slate-900">
                <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Blog reward</p>
                <p className="mt-1 text-sm font-semibold">+10% to +25% bonus (Coming soon)</p>
              </div>
              <div className="rounded-xl bg-white/85 p-3 text-slate-900">
                <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Store discount</p>
                <p className="mt-1 text-sm font-semibold">-5% to -10% (Coming soon)</p>
              </div>
              <div className="rounded-xl bg-white/85 p-3 text-slate-900">
                <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Current wallet</p>
                <p className="mt-1 text-sm font-semibold">{user ? `${formatCoins(walletBalanceCoins)} coin` : "Login required"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-amber-900">
              <div>
                <p className="font-semibold">
                  Current plan: {overview.subscription.planName} ({overview.subscription.billingCycle})
                </p>
                <p>
                  Expires:{" "}
                  {overview.subscription.expiresAt
                    ? new Date(overview.subscription.expiresAt).toLocaleDateString()
                    : "-"}
                </p>
              </div>
              <Link href="/settings/subscription">
                <Button variant="outline">Manage subscription</Button>
              </Link>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Billing cycle</CardTitle>
            <CardDescription>Switch cycle to see dynamic coin pricing and savings</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(["monthly", "quarterly", "yearly"] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  billingCycle === cycle
                    ? "bg-slate-950 text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
                onClick={() => setBillingCycle(cycle)}
              >
                {cycle === "monthly" ? "Month" : cycle === "quarterly" ? "Quarter (-10%)" : "Year (-20%)"}
              </button>
            ))}
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Loading subscription plans" />
          </div>
        ) : null}

        <section id="plan-section" className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const cyclePrice = getCyclePriceCoins(plan);
            const cta = getCta(plan);
            const lackingCoins = Math.max(cyclePrice - walletBalanceCoins, 0);

            return (
              <MotionDiv
                key={plan.code}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.3, delay: index * 0.05, ease: smoothEase }}
              >
                <Card className={plan.code === "vip" ? "border-cyan-300 shadow-[0_14px_40px_rgba(8,145,178,0.14)]" : "border-slate-200"}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle>{plan.name}</CardTitle>
                        <CardDescription>{plan.monthlyPostLimit} posts/month quota</CardDescription>
                      </div>
                      {plan.code === "vip" ? <Badge className="bg-cyan-600 text-white">Best value</Badge> : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Price</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-950">{formatCoins(cyclePrice)} coin</p>
                      <p className="text-xs text-slate-500">
                        {billingCycle === "monthly" ? "Monthly billing" : billingCycle === "quarterly" ? "Quarterly billing" : "Yearly billing"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {featureRows.map((row) => {
                        const value = plan.perks[row.key];
                        const display =
                          typeof value === "number"
                            ? `${value}${row.suffix ? ` ${row.suffix}` : ""}`
                            : String(value);
                        return (
                          <div key={`${plan.code}-${row.key}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <span className="text-slate-600">{row.label}</span>
                            <span className="font-semibold text-slate-900">{display}</span>
                          </div>
                        );
                      })}
                    </div>

                    {plan.perks.comingSoon ? (
                      <Badge className="bg-amber-100 text-amber-800">Some perks coming soon</Badge>
                    ) : null}

                    {user ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                        <p>Wallet: {formatCoins(walletBalanceCoins)} coin</p>
                        <p>{lackingCoins > 0 ? `Need +${formatCoins(lackingCoins)} coin` : "Enough balance for this plan"}</p>
                      </div>
                    ) : null}

                    {cta.action === "login" ? (
                      <Link href="/login" className="block">
                        <Button className="w-full">Login to upgrade</Button>
                      </Link>
                    ) : null}
                    {cta.action === "current" ? (
                      <Button className="w-full" disabled>
                        Current plan
                      </Button>
                    ) : null}
                    {cta.action === "manage" ? (
                      <Link href="/settings/subscription" className="block">
                        <Button className="w-full" variant="outline">
                          Manage in settings
                        </Button>
                      </Link>
                    ) : null}
                    {cta.action === "topup" ? (
                      <Link href="/dashboard/wallet" className="block">
                        <Button className="w-full" variant="outline">
                          Top up coins
                        </Button>
                      </Link>
                    ) : null}
                    {cta.action === "purchase" ? (
                      <Button
                        className="w-full"
                        disabled={cta.disabled}
                        onClick={() => setPurchaseState({ plan, billingCycle })}
                      >
                        Buy with coins
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              </MotionDiv>
            );
          })}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            "Blog: bonus reward + exclusive content (Coming soon)",
            "Store: discount + early sale access (Coming soon)",
            "Support: ticket priority and better SLA (Coming soon)",
            "Profile: badge + featured profile boost (Coming soon)",
          ].map((item) => (
            <Card key={item}>
              <CardContent className="p-4 text-sm text-slate-700">{item}</CardContent>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>FAQ</CardTitle>
            <CardDescription>Common subscription and wallet questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            {[
              ["How is a subscription paid?", "Subscriptions are purchased using wallet coins."],
              ["What if I do not have enough coins?", "Top up coins via PayOS on the Wallet page, then return to purchase a plan."],
              ["If I disable auto-renew, do I lose perks immediately?", "No. Your plan remains active until the current billing cycle ends."],
              ["Is subscription history available?", "Yes. You can view it in Settings > Subscription."],
            ].map(([question, answer]) => (
              <details key={question} className="rounded-lg border border-slate-200 bg-white p-3">
                <summary className="cursor-pointer font-semibold text-slate-900">{question}</summary>
                <p className="mt-2">{answer}</p>
              </details>
            ))}
          </CardContent>
        </Card>
      </MotionSection>

      {purchaseState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Confirm subscription purchase</CardTitle>
              <CardDescription>Wallet-based checkout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p>Plan: {purchaseState.plan.name}</p>
                <p>Cycle: {purchaseState.billingCycle}</p>
                <p>Price: {formatCoins(getCyclePriceCoins(purchaseState.plan))} coin</p>
                <p>Current balance: {formatCoins(walletBalanceCoins)} coin</p>
                <p>
                  Balance after purchase:{" "}
                  {formatCoins(walletBalanceCoins - getCyclePriceCoins(purchaseState.plan))} coin
                </p>
              </div>
              {walletBalanceCoins < getCyclePriceCoins(purchaseState.plan) ? (
                <p className="text-rose-700">
                  You do not have enough coin for this plan. Please top up wallet first.
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPurchaseState(null)} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  onClick={handlePurchaseConfirm}
                  disabled={
                    submitting || walletBalanceCoins < getCyclePriceCoins(purchaseState.plan)
                  }
                >
                  {submitting ? "Processing..." : "Confirm purchase"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </main>
  );
}

