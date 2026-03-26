import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addCartItem,
  checkoutCart,
  clearCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/api/cart";

function createEnvelope(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("cart api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("posts add-to-cart payload", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(createEnvelope({ items: [] })));
    vi.stubGlobal("fetch", fetchMock);

    await addCartItem({
      productId: "507f1f77bcf86cd799439011",
      quantity: 2,
    });

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/cart/items");
  });

  it("patches and deletes cart item by id", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(createEnvelope({ items: [] })));
    vi.stubGlobal("fetch", fetchMock);

    await updateCartItem("item-1", { quantity: 3 });
    await removeCartItem("item-1");

    const firstUrl = String(fetchMock.mock.calls[0]?.[0]);
    const secondUrl = String(fetchMock.mock.calls[1]?.[0]);
    expect(firstUrl).toContain("/cart/items/item-1");
    expect(secondUrl).toContain("/cart/items/item-1");
  });

  it("sends idempotency key for checkout and clear cart endpoint", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(createEnvelope({})));
    vi.stubGlobal("fetch", fetchMock);

    await checkoutCart({ idempotencyKey: "checkout-key-1" });
    await clearCart();

    const checkoutOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const checkoutBody = JSON.parse(String(checkoutOptions.body));
    const clearUrl = String(fetchMock.mock.calls[1]?.[0]);
    expect(checkoutBody.idempotencyKey).toBe("checkout-key-1");
    expect(clearUrl).toContain("/cart");
  });
});

