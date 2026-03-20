"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
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
  Select,
  Textarea,
} from "@/components/ui";
import { adjustWalletForAdmin } from "@/lib/api/wallet";
import type {
  AdminWalletAdjustPayload,
  AdminWalletAdjustResponse,
  WalletTransactionDirection,
} from "@/lib/types";

const smoothEase = [0.22, 1, 0.36, 1] as const;
const COIN_TO_VND_RATE = 1000;

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

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Number.isInteger(coinValue) ? 0 : 2,
    maximumFractionDigits: 3,
  }).format(coinValue);
}

function formatVnd(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatVndFromCoinInput(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return formatVnd(value * COIN_TO_VND_RATE);
}

function getSignedPreview(amount: number, direction: WalletTransactionDirection) {
  return direction === "debit" ? `-${formatCoins(amount)} coin` : `+${formatCoins(amount)} coin`;
}

function toDisplayText(value: unknown, fallback = "-") {
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

  const candidate = value as Record<string, unknown>;
  const model =
    typeof candidate.model === "string" && candidate.model.trim()
      ? candidate.model.trim()
      : undefined;
  const id =
    typeof candidate.id === "string" && candidate.id.trim()
      ? candidate.id.trim()
      : typeof candidate._id === "string" && candidate._id.trim()
        ? candidate._id.trim()
        : undefined;
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

export default function AdminWalletPage() {
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<WalletTransactionDirection>("credit");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<AdminWalletAdjustResponse | null>(null);

  const parsedAmount = Number(amount);
  const signedPreview = useMemo(() => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return "-";
    }

    return getSignedPreview(parsedAmount, direction);
  }, [direction, parsedAmount]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setResult(null);

    const normalizedUserId = userId.trim();
    const normalizedReason = reason.trim();
    const normalizedNote = note.trim();

    if (!normalizedUserId) {
      setError("Target user ID is required.");
      return;
    }

    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setError("Coin amount must be a positive integer.");
      return;
    }

    if (!normalizedReason) {
      setError("Reason is required.");
      return;
    }

    const payload: AdminWalletAdjustPayload = {
      userId: normalizedUserId,
      amount: parsedAmount * COIN_TO_VND_RATE,
      direction,
      reason: normalizedReason,
      ...(normalizedNote ? { note: normalizedNote } : {}),
    };

    setLoading(true);

    try {
      const response = await adjustWalletForAdmin(payload);
      setResult(response);
      setMessage(response.message ?? "Wallet adjustment completed.");
      setUserId("");
      setAmount("");
      setDirection("credit");
      setReason("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adjust wallet");
    } finally {
      setLoading(false);
    }
  }

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
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <Badge className="w-fit">Admin</Badge>
                  <CardTitle>Wallet adjustment</CardTitle>
                  <CardDescription>
                    Apply manual wallet credit/debit in coin. Conversion rate: 1 coin = 1,000 VND.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/admin"
                    className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Back to admin center
                  </Link>
                  <Link
                    href="/admin/users"
                    className="inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Open users
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Action</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Manual wallet credit or debit</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Preview</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{signedPreview}</p>
                <p className="mt-1 text-xs text-slate-500">
                  ~{formatVndFromCoinInput(parsedAmount > 0 ? parsedAmount : undefined)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reason</p>
                <p className="mt-2 text-sm text-slate-700">Required for auditability and support review.</p>
              </div>
            </CardContent>
          </Card>
        </MotionDiv>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3, ease: smoothEase }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Adjustment form</CardTitle>
                <CardDescription>
                  Submit a wallet adjustment request. Coin amount is entered as a positive integer; direction
                  determines whether it is a credit or debit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="userId">Target user ID</Label>
                      <Input
                        id="userId"
                        value={userId}
                        onChange={(event) => setUserId(event.target.value)}
                        placeholder="Enter the target user id"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">Coin amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="1"
                        step="1"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder="Enter coin amount"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="direction">Direction</Label>
                      <Select
                        id="direction"
                        value={direction}
                        onChange={(event) => setDirection(event.target.value as WalletTransactionDirection)}
                      >
                        <option value="credit">+ Credit</option>
                        <option value="debit">- Debit</option>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Input
                      id="reason"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Explain the business reason"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="note">Note</Label>
                    <Textarea
                      id="note"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Optional internal note"
                    />
                  </div>

                  {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                  {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Submitting..." : "Submit adjustment"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading}
                      onClick={() => {
                        setUserId("");
                        setAmount("");
                        setDirection("credit");
                        setReason("");
                        setNote("");
                        setError("");
                        setMessage("");
                        setResult(null);
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3, delay: 0.06, ease: smoothEase }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
                <CardDescription>
                  Successful responses are summarized here. Errors are shown inline above the form.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                {result ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                        Adjustment completed
                      </p>
                      <p className="mt-2 font-semibold text-emerald-900">{result.message ?? "Success"}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Wallet balance</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {formatCoins(result.wallet?.balance ?? result.balance)} coin
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          ~{formatVnd(result.wallet?.balance ?? result.balance)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Transaction</p>
                        <p className="mt-1 break-all font-semibold text-slate-900">
                          {toDisplayText(
                            result.transaction?.reference,
                            result.transaction?.id ?? "-",
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
                        <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Transaction status</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {result.transaction?.status ?? "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
                    Submit an adjustment to see the API response summary here.
                  </div>
                )}
              </CardContent>
            </Card>
          </MotionDiv>
        </div>
      </MotionSection>
    </main>
  );
}
