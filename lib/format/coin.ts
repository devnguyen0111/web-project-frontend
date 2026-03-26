import type { WalletSummary } from "@/lib/types";

const DEFAULT_COIN_TO_VND_RATE = 1000;

export function toCoinAmount(value?: number, coinToVndRate?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  const normalizedRate =
    typeof coinToVndRate === "number" && coinToVndRate > 0
      ? coinToVndRate
      : DEFAULT_COIN_TO_VND_RATE;

  return value / normalizedRate;
}

export function formatCoinAmount(
  value?: number,
  coinToVndRate?: number,
  locale = "en-US",
) {
  const amount = toCoinAmount(value, coinToVndRate);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

export function getWalletCoinBalance(summary?: WalletSummary | null) {
  return toCoinAmount(summary?.balance, summary?.coinToVndRate);
}

export function formatWalletCoinBalance(
  summary?: WalletSummary | null,
  locale = "en-US",
) {
  return formatCoinAmount(summary?.balance, summary?.coinToVndRate, locale);
}
