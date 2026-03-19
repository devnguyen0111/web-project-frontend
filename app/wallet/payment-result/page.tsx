"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  XCircle,
} from "lucide-react";
import { Suspense, type ComponentType, useEffect, useMemo, useState } from "react";
import { MotionSection } from "@/components/motion";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { getPayosReturnStatus, syncPayosReturnStatus } from "@/lib/api/wallet";
import type { PayosReturnStatus, PayosReturnStatusQuery, PayosReturnStatusResponse } from "@/lib/types";

const REFRESH_INTERVAL_MS = 3000;
const MAX_POLLING_WINDOW_MS = 2 * 60 * 1000;
const COIN_TO_VND_RATE = 1000;
const CANCEL_STATUS_SET = new Set(["CANCELLED", "CANCELED"]);
const FAILED_STATUS_SET = new Set(["FAILED", "EXPIRED"]);
const PENDING_STATUS_SET = new Set(["PENDING", "PROCESSING"]);
const PAID_STATUS_SET = new Set(["PAID", "SUCCESS", "SUCCEEDED"]);

type StatusHeroMeta = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  iconTone: string;
  panelTone: string;
};

const STATUS_META: Record<PayosReturnStatus, StatusHeroMeta> = {
  success: {
    title: "Payment successful",
    description:
      "Your payment has been confirmed. Wallet and order details have been updated.",
    icon: CheckCircle2,
    iconTone: "text-emerald-600",
    panelTone: "bg-emerald-50 border-emerald-200",
  },
  pending: {
    title: "Payment pending confirmation",
    description:
      "You returned to the site, but the system is still waiting for final confirmation.",
    icon: Clock3,
    iconTone: "text-amber-600",
    panelTone: "bg-amber-50 border-amber-200",
  },
  failed: {
    title: "Payment failed",
    description:
      "The transaction was not completed. You can retry or choose another payment flow.",
    icon: XCircle,
    iconTone: "text-rose-600",
    panelTone: "bg-rose-50 border-rose-200",
  },
  cancelled: {
    title: "Payment canceled",
    description:
      "The payment was canceled by the user. No wallet credit has been applied.",
    icon: AlertTriangle,
    iconTone: "text-orange-600",
    panelTone: "bg-orange-50 border-orange-200",
  },
  verifying: {
    title: "Verifying payment",
    description:
      "Redirect received from PayOS. We are checking the final payment state with backend records.",
    icon: LoaderCircle,
    iconTone: "text-cyan-600",
    panelTone: "bg-cyan-50 border-cyan-200",
  },
  unknown: {
    title: "Unknown payment state",
    description:
      "The return data is incomplete or not matched yet. We are still checking.",
    icon: AlertTriangle,
    iconTone: "text-slate-600",
    panelTone: "bg-slate-100 border-slate-300",
  },
};

const STATUS_BADGE_LABEL: Record<PayosReturnStatus, string> = {
  success: "SUCCESS",
  pending: "PENDING",
  failed: "FAILED",
  cancelled: "CANCELLED",
  verifying: "VERIFYING",
  unknown: "UNKNOWN",
};

function parseBooleanFlag(value: string) {
  return ["1", "true", "yes", "y"].includes(value.trim().toLowerCase());
}

function formatMoney(value?: number, currency = "VND") {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function toCoinFromStoredVnd(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return value / COIN_TO_VND_RATE;
}

function formatCoins(value?: number) {
  const coinValue = toCoinFromStoredVnd(value);
  if (typeof coinValue !== "number" || Number.isNaN(coinValue)) {
    return "-";
  }

  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(coinValue) ? 0 : 2,
    maximumFractionDigits: 3,
  }).format(coinValue)} coin`;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function shouldPoll(status: PayosReturnStatus) {
  return status === "pending" || status === "verifying" || status === "unknown";
}

function inferStatusFromHints(input: {
  statusHint: string;
  codeHint: string;
  cancelHint: boolean;
}): PayosReturnStatus {
  if (input.cancelHint || CANCEL_STATUS_SET.has(input.statusHint)) {
    return "cancelled";
  }

  if (FAILED_STATUS_SET.has(input.statusHint)) {
    return "failed";
  }

  if (PENDING_STATUS_SET.has(input.statusHint)) {
    return "pending";
  }

  if (PAID_STATUS_SET.has(input.statusHint) || input.codeHint === "00") {
    return "verifying";
  }

  return "unknown";
}

function normalizeApiStatus(status: string | undefined): PayosReturnStatus {
  if (!status) {
    return "unknown";
  }

  const normalized = status.toLowerCase();
  if (
    normalized === "success" ||
    normalized === "pending" ||
    normalized === "failed" ||
    normalized === "cancelled" ||
    normalized === "verifying" ||
    normalized === "unknown"
  ) {
    return normalized;
  }

  return "unknown";
}

function statusBadgeTone(status: PayosReturnStatus) {
  if (status === "success") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "pending" || status === "verifying") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "failed" || status === "cancelled") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-slate-200 text-slate-700";
}

function nextSteps(status: PayosReturnStatus) {
  if (status === "success") {
    return [
      "Open Wallet to confirm your updated coin balance.",
      "Check Transaction history for receipt details.",
      "Continue to dashboard or home.",
    ];
  }

  if (status === "pending" || status === "verifying" || status === "unknown") {
    return [
      "Keep this page open while the system auto-refreshes status every 3 seconds.",
      "If confirmation is delayed, open Wallet and review transaction history.",
      "Contact support with Order code if status is still unresolved.",
    ];
  }

  return [
    "Return to Wallet and create a new deposit request.",
    "Verify your banking app for any deducted amount.",
    "Contact support if funds were deducted but status remains failed.",
  ];
}

function resetReturnState(input: {
  inferredStatus: PayosReturnStatus;
  setResult: (value: PayosReturnStatusResponse | null) => void;
  setError: (value: string) => void;
  setLoading: (value: boolean) => void;
  setPolling: (value: boolean) => void;
  setUiStatus: (value: PayosReturnStatus) => void;
}) {
  input.setResult(null);
  input.setError("");
  input.setLoading(true);
  input.setPolling(false);
  input.setUiStatus(input.inferredStatus);
}

function PayosReturnContent() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<PayosReturnStatusResponse | null>(null);
  const [uiStatus, setUiStatus] = useState<PayosReturnStatus>("verifying");
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("");

  const queryContext = useMemo(() => {
    const orderCode = searchParams.get("orderCode")?.trim() ?? "";
    const id = searchParams.get("id")?.trim() ?? "";
    const paymentLinkId = searchParams.get("paymentLinkId")?.trim() ?? id;
    const statusHint = (searchParams.get("status") ?? "").trim().toUpperCase();
    const cancelRaw = searchParams.get("cancel") ?? "";
    const codeHint = (searchParams.get("code") ?? "").trim().toUpperCase();
    const signature = searchParams.get("signature")?.trim() ?? "";
    const cancelHint = parseBooleanFlag(cancelRaw) || CANCEL_STATUS_SET.has(statusHint);
    const inferredStatus = inferStatusFromHints({ statusHint, codeHint, cancelHint });

    return {
      orderCode,
      id,
      paymentLinkId,
      statusHint,
      cancelRaw,
      codeHint,
      cancelHint,
      inferredStatus,
      signature,
    };
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    resetReturnState({
      inferredStatus: queryContext.inferredStatus,
      setResult,
      setError,
      setLoading,
      setPolling,
      setUiStatus,
    });

    const requestPayload: PayosReturnStatusQuery = {
      orderCode: queryContext.orderCode || undefined,
      id: queryContext.id || undefined,
      paymentLinkId: queryContext.paymentLinkId || undefined,
      status: queryContext.statusHint || undefined,
      cancel: queryContext.cancelRaw || undefined,
      code: queryContext.codeHint || undefined,
      signature: queryContext.signature || undefined,
    };

    const shouldSyncCancel = Boolean(queryContext.orderCode) && queryContext.cancelHint;

    const pullStatus = async (syncCancel = false) => {
      if (!active) {
        return;
      }

      if (syncCancel && shouldSyncCancel) {
        try {
          await syncPayosReturnStatus(requestPayload);
        } catch {
          // Keep return page resilient even if return sync is temporarily unavailable.
        }
      }

      try {
        const payload = await getPayosReturnStatus(requestPayload);
        if (!active) {
          return;
        }

        const normalized = normalizeApiStatus(payload.status);
        setResult(payload);
        setUiStatus(normalized);
        setLastUpdatedAt(new Date().toISOString());
        setLoading(false);
        setError("");

        const canContinue =
          shouldPoll(normalized) &&
          Date.now() - startedAt < MAX_POLLING_WINDOW_MS;
        setPolling(canContinue);
        if (canContinue) {
          timer = setTimeout(() => {
            void pullStatus(false);
          }, REFRESH_INTERVAL_MS);
        }
      } catch (err) {
        if (!active) {
          return;
        }

        const fallbackStatus = queryContext.inferredStatus;
        setUiStatus(fallbackStatus);
        setLoading(false);
        setError(err instanceof Error ? err.message : "Failed to read payment return status");

        const canContinue =
          shouldPoll(fallbackStatus) &&
          Date.now() - startedAt < MAX_POLLING_WINDOW_MS;
        setPolling(canContinue);
        if (canContinue) {
          timer = setTimeout(() => {
            void pullStatus(false);
          }, REFRESH_INTERVAL_MS);
        }
      }
    };

    void pullStatus(true);

    return () => {
      active = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [
    queryContext.orderCode,
    queryContext.id,
    queryContext.paymentLinkId,
    queryContext.statusHint,
    queryContext.cancelRaw,
    queryContext.codeHint,
    queryContext.cancelHint,
    queryContext.inferredStatus,
    queryContext.signature,
  ]);

  const meta = STATUS_META[uiStatus];
  const Icon = meta.icon;
  const transaction = result?.transaction;
  const walletTopup = result?.walletTopup;
  const statusText = STATUS_BADGE_LABEL[uiStatus];
  const primaryActionLabel =
    uiStatus === "success" ? "Go to wallet" : "Open wallet";
  const stepList = nextSteps(uiStatus);
  const orderCodeDisplay =
    transaction?.orderCode || queryContext.orderCode || "-";
  const paymentLinkIdDisplay =
    transaction?.paymentLinkId || queryContext.paymentLinkId || "-";
  const coinAmount = transaction?.coinAmount ?? walletTopup?.coinAmount;

  return (
    <main className="pb-16 pt-0">
      <MotionSection
        className="relative isolate overflow-hidden bg-gradient-to-br from-cyan-100 via-sky-100 to-amber-100 text-slate-900"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute right-0 top-12 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
        </div>

        <div className="section-shell relative py-14 lg:px-16 lg:py-20 xl:px-20">
          <Card className="overflow-hidden border-white/10 bg-white/80 text-slate-800 shadow-2xl shadow-slate-950/20 backdrop-blur">
            <CardContent className="grid gap-6 p-8 md:grid-cols-[1.25fr_0.75fr] md:p-10">
              <div className="space-y-4">
                <Badge className={`w-fit rounded-full px-3 py-1 ${statusBadgeTone(uiStatus)}`}>
                  {statusText}
                </Badge>
                <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                  {meta.title}
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
                  {result?.message || meta.description}
                </p>
                <p className="text-sm text-slate-500">
                  Display unit: coin (1 coin = 1,000 VND).
                  {polling ? " Auto-checking payment state every 3 seconds." : ""}
                </p>
                {!loading && lastUpdatedAt ? (
                  <p className="text-xs text-slate-500">
                    Last checked: {formatDateTime(lastUpdatedAt)}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/10 p-5">
                <div className="rounded-xl border border-white/10 bg-white/78 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-700">
                    Order code
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                    {orderCodeDisplay}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/78 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-700">
                    Payment link
                  </p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                    {paymentLinkIdDisplay}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/78 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-700">
                    Amount
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatCoins(coinAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </MotionSection>

      <section className="section-shell">
        <Card className={`border ${meta.panelTone}`}>
          <CardContent className="p-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-white/80 bg-white/75 shadow-sm">
                <Icon
                  className={`h-11 w-11 ${meta.iconTone} ${
                    uiStatus === "verifying" ? "animate-spin" : ""
                  }`}
                />
              </div>
              <div className="mt-5 flex items-center justify-center gap-2">
                <Badge className={`rounded-full px-3 py-1 ${statusBadgeTone(uiStatus)}`}>
                  {statusText}
                </Badge>
                <Badge className="rounded-full px-3 py-1">PayOS</Badge>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                {meta.title}
              </h1>
              <p className="mt-2 text-base text-slate-600">
                {result?.message || meta.description}
              </p>
              <p className="mt-1 text-sm text-slate-500">Display unit: coin (1 coin = 1,000 VND).</p>
              {polling ? (
                <p className="mt-3 text-sm text-slate-500">
                  Auto-checking payment state every 3 seconds.
                </p>
              ) : null}
              {!loading && lastUpdatedAt ? (
                <p className="mt-1 text-xs text-slate-500">
                  Last checked: {formatDateTime(lastUpdatedAt)}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {error ? (
          <Card className="mt-6 border-rose-200 bg-rose-50/80">
            <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Transaction information</CardTitle>
              <CardDescription>Verified data from PayOS return flow and backend record.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {loading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
                  Loading payment status...
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Order code</p>
                  <p className="mt-1 break-all font-semibold text-slate-900">{orderCodeDisplay}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Transaction ID</p>
                  <p className="mt-1 break-all font-semibold text-slate-900">{transaction?.id ?? "-"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Amount</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatCoins(coinAmount)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Payment method</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {transaction?.paymentMethod ?? "QR bank transfer"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Created at</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDateTime(transaction?.createdAt)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Confirmed at</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDateTime(transaction?.confirmedAt)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Provider</p>
                  <p className="mt-1 font-semibold text-slate-900">PayOS</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Current status</p>
                  <p className="mt-1 font-semibold text-slate-900">{statusText}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 sm:col-span-2">
                  <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Payment link ID</p>
                  <p className="mt-1 break-all font-semibold text-slate-900">{paymentLinkIdDisplay}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wallet top-up details</CardTitle>
              <CardDescription>Business information for wallet deposit case.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
                  {uiStatus === "success" ? "Coin credited" : "Coin amount"}
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {formatCoins(walletTopup?.coinAmount ?? transaction?.coinAmount)}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Exchange rate</p>
                <p className="mt-1 font-semibold text-slate-900">
                  1 coin = {formatMoney(COIN_TO_VND_RATE, walletTopup?.currency ?? "VND")}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Balance before</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {formatCoins(walletTopup?.balanceBefore ?? transaction?.balanceBefore)}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Balance after</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {formatCoins(walletTopup?.balanceAfter ?? transaction?.balanceAfter)}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Wallet transaction ID</p>
                <p className="mt-1 break-all font-semibold text-slate-900">
                  {walletTopup?.walletTransactionId ?? transaction?.id ?? "-"}
                </p>
              </div>

              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  uiStatus === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : uiStatus === "failed" || uiStatus === "cancelled"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {walletTopup?.note ??
                  (uiStatus === "success"
                    ? "Coins have been added to your wallet."
                    : "Wallet update will be applied after final confirmation.")}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
            <CardDescription>Recommended actions based on the current payment state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-slate-700">
              {stepList.map((step) => (
                <li key={step} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  {step}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/wallet"
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-400"
              >
                {primaryActionLabel}
              </Link>
              <Link
                href="/dashboard/wallet"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                View transaction history
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back home
              </Link>
              {transaction?.checkoutUrl &&
              (uiStatus === "pending" || uiStatus === "verifying") ? (
                <a
                  href={transaction.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Open PayOS page
                </a>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export default function PayosReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="pb-16 pt-10">
          <section className="section-shell">
            <Card>
              <CardContent className="p-8 text-center text-sm text-slate-600">
                Loading payment result...
              </CardContent>
            </Card>
          </section>
        </main>
      }
    >
      <PayosReturnContent />
    </Suspense>
  );
}


