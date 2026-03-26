import { toCoinAmount } from "@/lib/format/coin";
import type { AuthUser, StoreProduct, SubscriptionPlanCode } from "@/lib/types";

const PLAN_DISCOUNT_PERCENT: Record<SubscriptionPlanCode, number> = {
  free: 0,
  pro: 5,
  vip: 10,
};

type PriceDisplayResult = {
  baseCoins: number;
  finalCoins: number;
  appliedDiscountPercent: number;
  hasDiscount: boolean;
};

function normalizeDiscountPercent(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(Math.floor(value), 100));
}

function roundPrice(value: number) {
  return Math.round(value * 100) / 100;
}

export function isVipActive(user?: AuthUser | null) {
  return (
    user?.subscription?.status === "active" &&
    user?.subscription?.planCode === "vip"
  );
}

export function getUserStoreDiscountPercent(user?: AuthUser | null) {
  if (!user || user.subscription.status !== "active") {
    return 0;
  }

  return PLAN_DISCOUNT_PERCENT[user.subscription.planCode] ?? 0;
}

export function resolveStorePriceDisplay(
  product: Pick<StoreProduct, "priceAmount" | "type">,
  discountPercent: number,
  coinToVndRate?: number,
): PriceDisplayResult {
  const baseCoins = roundPrice(toCoinAmount(product.priceAmount, coinToVndRate));
  if (product.type !== "digital") {
    return {
      baseCoins,
      finalCoins: baseCoins,
      appliedDiscountPercent: 0,
      hasDiscount: false,
    };
  }

  const appliedDiscountPercent = normalizeDiscountPercent(discountPercent);
  if (appliedDiscountPercent <= 0) {
    return {
      baseCoins,
      finalCoins: baseCoins,
      appliedDiscountPercent: 0,
      hasDiscount: false,
    };
  }

  const discounted = roundPrice(
    baseCoins - (baseCoins * appliedDiscountPercent) / 100,
  );

  return {
    baseCoins,
    finalCoins: discounted,
    appliedDiscountPercent,
    hasDiscount: discounted < baseCoins,
  };
}

export function formatCoinLabel(value: number, locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

export function toStoredPriceFromCoin(value: number, coinToVndRate = 1000) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value * coinToVndRate));
}

export function formatFileSize(size?: number) {
  if (typeof size !== "number" || Number.isNaN(size) || size <= 0) {
    return "Unknown size";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatFileType(
  mimeType?: string,
  fallbackName?: string,
): string {
  if (mimeType?.trim()) {
    return mimeType.trim();
  }

  if (!fallbackName) {
    return "Unknown type";
  }

  const dotIndex = fallbackName.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === fallbackName.length - 1) {
    return "Unknown type";
  }

  return fallbackName.slice(dotIndex + 1).toUpperCase();
}
