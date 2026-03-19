"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { MotionDiv, MotionSection } from "@/components/motion";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Spinner,
} from "@/components/ui";
import {
  cancelDepositRequest,
  createDepositRequest,
  getDepositRequest,
  getMyWalletSummary,
  listMyWalletTransactions,
} from "@/lib/api/wallet";
import { useWalletSectionMotion } from "./hooks/use-wallet-section-motion";
import type {
  CreateDepositRequestResponse,
  WalletSummary,
  WalletTransactionDirection,
  WalletTransaction,
  WalletTransactionStatus,
} from "@/lib/types";

const PAGE_SIZE = 10;
const COIN_TO_VND_RATE = 1000;

function toCoinFromStoredVnd(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  return value / COIN_TO_VND_RATE;
}

function formatVnd(value?: number, currency = "VND") {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCoins(value?: number) {
  const coinValue = toCoinFromStoredVnd(value);
  if (typeof coinValue !== "number" || Number.isNaN(coinValue)) {
    return "-";
  }

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(coinValue) ? 0 : 2,
    maximumFractionDigits: 3,
  }).format(coinValue);
  return `${formatted} coin`;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getPaymentUrl(response: CreateDepositRequestResponse) {
  return (
    response.paymentUrl ??
    response.redirectUrl ??
    response.checkoutUrl ??
    response.qrCodeUrl ??
    ""
  );
}

function getNestedString(source: unknown, path: string[]) {
  let current: unknown = source;

  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" && current.trim()
    ? current.trim()
    : undefined;
}

function getDisplayText(value: unknown, fallback = "-") {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || fallback;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const model = getNestedString(value, ["model"]);
  const id = getNestedString(value, ["id"]) ?? getNestedString(value, ["_id"]);
  if (model || id) {
    return [model, id].filter(Boolean).join(":");
  }

  try {
    const serialized = JSON.stringify(value);
    return serialized && serialized !== "{}" ? serialized : fallback;
  } catch {
    return fallback;
  }
}

function getQrPayload(response: CreateDepositRequestResponse) {
  return (
    response.qrCode ??
    getNestedString(response, [
      "transaction",
      "externalPayment",
      "providerPayload",
      "createResponse",
      "data",
      "qrCode",
    ]) ??
    getNestedString(response, [
      "transaction",
      "metadata",
      "providerPayload",
      "createResponse",
      "data",
      "qrCode",
    ])
  );
}

function buildQrImageSource(value?: string) {
  if (!value) {
    return "";
  }

  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  if (
    normalized.startsWith("data:image/") ||
    /^https?:\/\//i.test(normalized)
  ) {
    return normalized;
  }

  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(normalized)}`;
}

function resolveDirection(
  transaction: WalletTransaction,
): WalletTransactionDirection {
  if (transaction.direction) {
    return transaction.direction;
  }

  const before = Number(transaction.balanceBefore);
  const after = Number(transaction.balanceAfter);
  if (Number.isFinite(before) && Number.isFinite(after) && after !== before) {
    return after > before ? "credit" : "debit";
  }

  const debitTypes = new Set([
    "purchase",
    "subscription",
    "platform_fee",
    "withdrawal",
    "refund_store",
  ]);
  return debitTypes.has(transaction.type) ? "debit" : "credit";
}

function getTransactionDirectionLabel(direction: WalletTransactionDirection) {
  return direction === "credit" ? "Credit" : "Debit";
}

function getTransactionTypeLabel(type: string) {
  return type.replace(/_/g, " ");
}

function getTransactionStatusBadge(status: WalletTransactionStatus | string) {
  const normalized = status.toLowerCase();

  if (
    normalized === "completed" ||
    normalized === "success" ||
    normalized === "succeeded"
  ) {
    return { label: status, variant: "accent" as const };
  }

  if (
    normalized === "failed" ||
    normalized === "canceled" ||
    normalized === "cancelled"
  ) {
    return { label: status, variant: "destructive" as const };
  }

  return { label: status, variant: "default" as const };
}

function getSignedAmount(transaction: WalletTransaction) {
  const amount = Number(transaction.amount) || 0;
  const direction = resolveDirection(transaction);
  return direction === "debit" ? -Math.abs(amount) : Math.abs(amount);
}

export function WalletDashboardSection() {
  const smoothEase = useWalletSectionMotion();
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ total: 0, totalPages: 1 });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [depositLoading, setDepositLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [depositError, setDepositError] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [paymentQrSrc, setPaymentQrSrc] = useState("");
  const [activeDepositRequestId, setActiveDepositRequestId] = useState<
    string | null
  >(null);
  const [activeDepositStatus, setActiveDepositStatus] = useState<string | null>(
    null,
  );
  const [paymentResultStatus, setPaymentResultStatus] = useState<
    "completed" | "failed" | null
  >(null);
  const [paymentResultMessage, setPaymentResultMessage] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    let active = true;

    getMyWalletSummary()
      .then((loadedSummary) => {
        if (active) {
          setSummary(loadedSummary);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load wallet summary",
          );
        }
      })
      .finally(() => {
        if (active) {
          setSummaryLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      setTransactionsLoading(true);

      try {
        const result = await listMyWalletTransactions({
          page,
          limit: PAGE_SIZE,
        });
        if (!active) {
          return;
        }

        setTransactions(result.data);
        setPage(result.page);
        setPageInfo({
          total: result.total,
          totalPages: Math.max(1, result.totalPages),
        });
      } catch (err) {
        if (!active) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load wallet transactions",
        );
        setTransactions([]);
        setPageInfo({ total: 0, totalPages: 1 });
      } finally {
        if (active) {
          setTransactionsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [page]);

  async function refreshWalletPanels(targetPage = 1) {
    const [refreshedSummary, refreshed] = await Promise.all([
      getMyWalletSummary(),
      listMyWalletTransactions({ page: targetPage, limit: PAGE_SIZE }),
    ]);

    setSummary(refreshedSummary);
    setTransactions(refreshed.data);
    setPage(targetPage);
    setPageInfo({
      total: refreshed.total,
      totalPages: Math.max(1, refreshed.totalPages),
    });
  }

  useEffect(() => {
    if (!activeDepositRequestId) {
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    const maxTrackingMs = 10 * 60 * 1000;

    const pollDepositStatus = async () => {
      try {
        const latest = await getDepositRequest(activeDepositRequestId);
        if (!active) {
          return;
        }

        const status = String(latest.status ?? "pending");
        const normalizedStatus = status.toLowerCase();
        setActiveDepositStatus(status);

        if (normalizedStatus === "completed") {
          setDepositError("");
          setPaymentResultStatus("completed");
          setPaymentResultMessage(
            "Payment successful. Coins have been added to your wallet.",
          );
          setActiveDepositRequestId(null);
          setActiveDepositStatus(null);
          await refreshWalletPanels(1);
          return;
        }

        if (normalizedStatus === "failed" || normalizedStatus === "reversed") {
          setPaymentResultStatus("failed");
          setPaymentResultMessage("Payment was canceled or failed.");
          setPaymentLink("");
          setActiveDepositRequestId(null);
          setActiveDepositStatus(null);
          await refreshWalletPanels(1);
          return;
        }
      } catch {
        // Keep polling on transient network/auth errors.
      }

      if (!active) {
        return;
      }

      if (Date.now() - startedAt > maxTrackingMs) {
        setPaymentResultStatus(null);
        setPaymentResultMessage(
          "Still waiting for payment confirmation. Check transaction history below.",
        );
        setActiveDepositRequestId(null);
        setActiveDepositStatus(null);
        return;
      }

      timer = setTimeout(() => {
        void pollDepositStatus();
      }, 3000);
    };

    void pollDepositStatus();

    return () => {
      active = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [activeDepositRequestId]);

  async function handleDepositRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDepositError("");
    setPaymentLink("");
    setPaymentQrSrc("");
    setActiveDepositRequestId(null);
    setActiveDepositStatus(null);
    setPaymentResultStatus(null);
    setPaymentResultMessage("");

    const parsedAmount = Number(amount);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setDepositError("Please enter a positive integer coin amount.");
      return;
    }

    setDepositLoading(true);

    try {
      const vndAmount = parsedAmount * COIN_TO_VND_RATE;
      const response = await createDepositRequest({
        amount: vndAmount,
        amountReal: vndAmount,
        exchangeRate: COIN_TO_VND_RATE,
        currency: "VND",
        provider: "payos",
      });

      const url = getPaymentUrl(response);
      const qrPayload = response.qrCodeUrl ?? getQrPayload(response);
      const qrSource = buildQrImageSource(qrPayload);
      if (qrSource) {
        setPaymentQrSrc(qrSource);
      }
      const transactionId =
        response.transaction?.id ?? response.transaction?._id;
      const transactionStatus = response.transaction?.status ?? "pending";
      if (transactionId) {
        setActiveDepositRequestId(transactionId);
        setActiveDepositStatus(transactionStatus);
        setPaymentResultStatus(null);
        setPaymentResultMessage("Waiting for payment confirmation...");
      }
      if (url) {
        setPaymentLink(url);
      }

      setAmount("");
      try {
        await refreshWalletPanels(1);
      } catch {
        // Keep the deposit flow successful even if the transaction refresh fails.
      }
    } catch (err) {
      setDepositError(
        err instanceof Error ? err.message : "Failed to create deposit request",
      );
    } finally {
      setDepositLoading(false);
    }
  }

  async function handleCancelPayment() {
    if (!activeDepositRequestId) {
      return;
    }

    setCancelLoading(true);
    setDepositError("");

    try {
      const cancelled = await cancelDepositRequest(
        activeDepositRequestId,
        "Cancelled from wallet dashboard",
      );
      setActiveDepositStatus(String(cancelled.status ?? "failed"));
      setActiveDepositRequestId(null);
      setPaymentResultStatus("failed");
      setPaymentResultMessage("Payment has been canceled.");
      setPaymentLink("");
      await refreshWalletPanels(1);
    } catch (err) {
      setDepositError(
        err instanceof Error ? err.message : "Failed to cancel payment",
      );
    } finally {
      setCancelLoading(false);
    }
  }

  const fiatCurrency = summary?.currency ?? "VND";
  const availableBalance =
    summary?.availableBalance ??
    Math.max((summary?.balance ?? 0) - (summary?.frozenBalance ?? 0), 0);
  const pendingBalance = summary?.pendingBalance ?? summary?.frozenBalance ?? 0;
  const totalDeposited =
    summary?.totalDeposited ?? summary?.lifetimeDeposit ?? 0;
  const showPaymentQr = Boolean(paymentQrSrc);
  const keyStats = [
    {
      label: "Current balance",
      value: formatCoins(summary?.balance),
    },
    {
      label: "Available balance",
      value: formatCoins(availableBalance),
    },
    {
      label: "Pending deposits",
      value: formatCoins(pendingBalance),
    },
    {
      label: "Lifetime deposits",
      value: formatCoins(totalDeposited),
    },
    {
      label: "Total spent",
      value: formatCoins(summary?.totalSpent ?? 0),
    },
  ];

  const openPaymentLabel = activeDepositRequestId
    ? `Open payment (${String(activeDepositStatus ?? "pending").toUpperCase()})`
    : "Open payment page";
  const qrStatusSource =
    paymentResultStatus ?? activeDepositStatus ?? "pending";
  const qrStatusBadge = getTransactionStatusBadge(qrStatusSource);
  const qrHeadline =
    paymentResultStatus === "completed"
      ? "Payment confirmed"
      : paymentResultStatus === "failed"
        ? "Payment canceled"
        : "Scan the QR code to complete payment";
  const qrDescription =
    paymentResultStatus === "completed"
      ? "Your wallet has been updated. You can continue your purchase now."
      : paymentResultStatus === "failed"
        ? "This payment request is no longer active."
        : "No page refresh needed. Status updates appear here automatically.";
  const initialLoading = summaryLoading && transactionsLoading;

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
            <Badge className="w-fit border border-cyan-200/80 bg-white/80 text-slate-800">Wallet</Badge>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Wallet balance, deposit flow, and transaction history in one full-width shell
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
                Create deposit requests, scan the payment QR, and review the ledger in centered cards that
                stay readable on desktop and mobile.
              </p>
            </div>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.42, delay: 0.08, ease: smoothEase }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Balance</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatCoins(summary?.balance)}</p>
              </div>
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Available</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatCoins(availableBalance)}</p>
              </div>
              <div className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Transactions</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{pageInfo.total}</p>
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
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04, ease: smoothEase }}
        >
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <Badge className="w-fit">Wallet</Badge>
                  <CardTitle>Payments and wallet balance</CardTitle>
                </div>
                <Link
                  href="/dashboard"
                  className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Back to dashboard
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {keyStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-900">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              {summary?.lastTransactionAt ? (
                <p className="text-sm text-slate-600">
                  Last activity: {formatDateTime(summary.lastTransactionAt)}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </MotionDiv>

        {initialLoading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Loading wallet" />
          </div>
        ) : null}

        {error ? (
          <MotionDiv
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: smoothEase }}
          >
            <Card className="border-rose-200 bg-rose-50/80">
              <CardContent className="p-4 text-sm text-rose-700">
                {error}
              </CardContent>
            </Card>
          </MotionDiv>
        ) : null}

        <div
          className={`grid items-start gap-6 ${
            showPaymentQr
              ? "xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,1fr)]"
              : ""
          }`}
        >
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3, ease: smoothEase }}
          >
            <Card className="border-slate-200/90">
              <CardHeader className="space-y-2 pb-4">
                <CardTitle>Request deposit</CardTitle>
                <CardDescription>
                  Enter coin amount. PayOS payment value is auto-converted at 1
                  coin = 1,000 VND.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-5" onSubmit={handleDepositRequest}>
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor="depositAmount"
                          className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
                        >
                          Coin amount
                        </Label>
                        <Input
                          id="depositAmount"
                          type="number"
                          min="1"
                          step="1"
                          value={amount}
                          onChange={(event) => setAmount(event.target.value)}
                          placeholder="Ex: 10"
                          className="bg-white"
                        />
                        {Number.isInteger(Number(amount)) &&
                        Number(amount) > 0 ? (
                          <p className="text-xs text-slate-500">
                            Payment value:{" "}
                            <span className="font-semibold text-slate-700">
                              {formatVnd(
                                Number(amount) * COIN_TO_VND_RATE,
                                fiatCurrency,
                              )}
                            </span>
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                          Provider
                        </Label>
                        <Input value="PayOS" readOnly className="bg-white" />
                      </div>
                    </div>
                  </div>

                  {depositError ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {depositError}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button type="submit" disabled={depositLoading}>
                      {depositLoading
                        ? "Creating request..."
                        : "Create deposit request"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={depositLoading}
                      onClick={() => {
                        setAmount("");
                        setDepositError("");
                        setPaymentLink("");
                        setPaymentQrSrc("");
                        setActiveDepositRequestId(null);
                        setActiveDepositStatus(null);
                        setPaymentResultStatus(null);
                        setPaymentResultMessage("");
                      }}
                    >
                      Reset
                    </Button>
                    {paymentLink && paymentResultStatus !== "failed" ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={depositLoading}
                        onClick={() =>
                          window.open(
                            paymentLink,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        {openPaymentLabel}
                      </Button>
                    ) : null}
                  </div>
                </form>
              </CardContent>
            </Card>
          </MotionDiv>

          {paymentQrSrc ? (
            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3, delay: 0.06, ease: smoothEase }}
            >
              <Card className="border-slate-200/90">
                <CardHeader className="space-y-2 pb-4">
                  <Badge
                    variant={qrStatusBadge.variant}
                    className="w-fit rounded-full px-3 py-1"
                  >
                    {String(qrStatusBadge.label).toUpperCase()}
                  </Badge>
                  <CardTitle className="text-2xl tracking-tight">
                    <span className="bg-gradient-to-r from-cyan-600 via-sky-500 to-emerald-500 bg-clip-text text-transparent">
                      Payment QR
                    </span>
                  </CardTitle>
                  <CardDescription>
                    <span className="font-medium text-slate-900">
                      {qrHeadline}
                    </span>
                    {" � "}
                    {qrDescription}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700">
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 via-white to-sky-50/40 p-5">
                    <Image
                      src={paymentQrSrc}
                      alt="PayOS QR code"
                      width={256}
                      height={256}
                      unoptimized
                      className="mx-auto h-64 w-64 max-w-full rounded-xl border border-slate-100 bg-white object-contain shadow-sm"
                    />
                  </div>
                  {paymentResultMessage ? (
                    <div
                      className={
                        paymentResultStatus === "completed"
                          ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
                          : paymentResultStatus === "failed"
                            ? "rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
                            : "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                      }
                    >
                      {paymentResultMessage}
                    </div>
                  ) : null}
                  {activeDepositRequestId &&
                  (activeDepositStatus ?? "pending").toLowerCase() ===
                    "pending" ? (
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={cancelLoading}
                        className="w-full sm:w-auto"
                        onClick={() => {
                          void handleCancelPayment();
                        }}
                      >
                        {cancelLoading ? "Canceling..." : "Cancel payment"}
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </MotionDiv>
          ) : null}
        </div>

        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.3, delay: 0.08, ease: smoothEase }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Transaction history</CardTitle>
              <CardDescription>
                Page {page} of {pageInfo.totalPages} from your wallet
                transactions endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {transactionsLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner label="Loading transactions" />
                </div>
              ) : null}

              {!transactionsLoading && transactions.length === 0 ? (
                <p className="text-sm text-slate-500">No transactions found.</p>
              ) : null}

              {!transactionsLoading && transactions.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Provider</th>
                        <th className="px-4 py-3 font-semibold">Amount</th>
                        <th className="px-4 py-3 font-semibold">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {transactions.map((transaction) => {
                        const statusBadge = getTransactionStatusBadge(
                          transaction.status,
                        );
                        const signedAmount = getSignedAmount(transaction);
                        const direction = resolveDirection(transaction);
                        const referenceLabel = getDisplayText(
                          transaction.reference,
                          transaction._id ?? "-",
                        );
                        const reasonLabel = getDisplayText(
                          transaction.reason,
                          "",
                        );

                        return (
                          <tr
                            key={transaction.id ?? transaction._id}
                            className="text-slate-700"
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              {formatDateTime(transaction.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <p className="font-semibold text-slate-900">
                                  {getTransactionTypeLabel(transaction.type)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {getTransactionDirectionLabel(direction)}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={statusBadge.variant}>
                                {statusBadge.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {String(
                                transaction.provider ?? "payos",
                              ).toUpperCase()}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {signedAmount >= 0 ? "+" : "-"}
                              {formatCoins(Math.abs(signedAmount))}
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <p className="break-all font-medium text-slate-900">
                                  {referenceLabel}
                                </p>
                                {reasonLabel ? (
                                  <p className="text-xs text-slate-500">
                                    {reasonLabel}
                                  </p>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  Showing {transactions.length} of {pageInfo.total}{" "}
                  transactions.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={transactionsLoading || page <= 1}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      transactionsLoading || page >= pageInfo.totalPages
                    }
                    onClick={() =>
                      setPage((current) =>
                        Math.min(pageInfo.totalPages, current + 1),
                      )
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionDiv>
      </MotionSection>
      </section>
    </main>
  );
}


