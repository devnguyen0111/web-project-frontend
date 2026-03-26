import { describe, expect, it } from "vitest";
import {
  formatFileType,
  getUserStoreDiscountPercent,
  isVipActive,
  resolveStorePriceDisplay,
  toStoredPriceFromCoin,
} from "@/lib/format/store-pricing";

describe("store pricing helpers", () => {
  it("returns discount percent from active subscription plan", () => {
    expect(
      getUserStoreDiscountPercent({
        subscription: { planCode: "free", status: "active" },
      } as never),
    ).toBe(0);

    expect(
      getUserStoreDiscountPercent({
        subscription: { planCode: "pro", status: "active" },
      } as never),
    ).toBe(5);

    expect(
      getUserStoreDiscountPercent({
        subscription: { planCode: "vip", status: "active" },
      } as never),
    ).toBe(10);

    expect(
      getUserStoreDiscountPercent({
        subscription: { planCode: "vip", status: "expired" },
      } as never),
    ).toBe(0);
  });

  it("detects active vip status", () => {
    expect(
      isVipActive({ subscription: { planCode: "vip", status: "active" } } as never),
    ).toBe(true);

    expect(
      isVipActive({ subscription: { planCode: "pro", status: "active" } } as never),
    ).toBe(false);
  });

  it("applies discount only for digital products", () => {
    const digital = resolveStorePriceDisplay(
      { priceAmount: 200_000, type: "digital" },
      10,
    );

    expect(digital.baseCoins).toBe(200);
    expect(digital.finalCoins).toBe(180);
    expect(digital.hasDiscount).toBe(true);

    const custom = resolveStorePriceDisplay(
      { priceAmount: 200_000, type: "custom_order" },
      10,
    );

    expect(custom.baseCoins).toBe(200);
    expect(custom.finalCoins).toBe(200);
    expect(custom.hasDiscount).toBe(false);
  });

  it("converts coin input to stored price amount", () => {
    expect(toStoredPriceFromCoin(2450)).toBe(2_450_000);
    expect(toStoredPriceFromCoin(-20)).toBe(0);
  });

  it("formats fallback file type from file extension", () => {
    expect(formatFileType(undefined, "asset.zip")).toBe("ZIP");
    expect(formatFileType("application/pdf", "asset.zip")).toBe(
      "application/pdf",
    );
  });
});
