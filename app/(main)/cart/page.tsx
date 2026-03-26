"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Input,
  Spinner,
} from "@/components/ui";
import {
  addCartItem,
  clearCart,
  getMyCart,
  removeCartItem,
  updateCartItem,
  checkoutCart,
} from "@/lib/api/cart";
import { getSessionIdempotencyKey, clearSessionIdempotencyKey } from "@/lib/idempotency";
import type { Cart, CartItem } from "@/lib/types";

const smoothEase = [0.22, 1, 0.36, 1] as const;

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

function getOrderId(result: { order?: { id?: string; _id?: string } }) {
  return result.order?.id ?? result.order?._id ?? "";
}

function cartItemKey(item: CartItem) {
  return item._id ?? item.productId;
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [draftQuantities, setDraftQuantities] = useState<Record<string, number>>({});
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const orderTotal = useMemo(() => cart?.total ?? 0, [cart]);

  async function refreshCart() {
    const nextCart = await getMyCart();
    setCart(nextCart);
    setDraftQuantities(
      Object.fromEntries(
        nextCart.items.map((item) => [cartItemKey(item), item.quantity]),
      ),
    );
  }

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    getMyCart()
      .then((result) => {
        if (!active) {
          return;
        }

        setCart(result);
        setDraftQuantities(
          Object.fromEntries(
            result.items.map((item) => [cartItemKey(item), item.quantity]),
          ),
        );
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load cart");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleAddItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await addCartItem({
        productId: productId.trim(),
        quantity: Math.max(1, Math.floor(quantity)),
      });
      await refreshCart();
      setProductId("");
      setQuantity(1);
      setMessage("Item added to cart.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add item failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateItem(item: CartItem) {
    const itemKey = cartItemKey(item);
    const nextQuantity = Math.max(1, Math.floor(draftQuantities[itemKey] ?? item.quantity));
    setActiveItemId(itemKey);
    setError("");
    setMessage("");

    try {
      await updateCartItem(itemKey, { quantity: nextQuantity });
      await refreshCart();
      setMessage("Cart updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActiveItemId(null);
    }
  }

  async function handleRemoveItem(itemId: string) {
    setActiveItemId(itemId);
    setError("");
    setMessage("");

    try {
      await removeCartItem(itemId);
      await refreshCart();
      setMessage("Item removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setActiveItemId(null);
    }
  }

  async function handleClearCart() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await clearCart();
      await refreshCart();
      setMessage("Cart cleared.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear cart failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckout() {
    setCheckoutLoading(true);
    setError("");
    setMessage("");

    try {
      const idempotencyKey = getSessionIdempotencyKey("cart.checkout", "cart-checkout");
      const result = await checkoutCart({ idempotencyKey });
      clearSessionIdempotencyKey("cart.checkout");
      setCart(result.cart);
      setDraftQuantities({});
      router.push(`/dashboard/orders/${getOrderId(result)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="section-shell flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
        <Spinner label="Loading cart" />
      </main>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <main className="pb-14 pt-10">
      <MotionSection
        className="section-shell space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: smoothEase }}
      >
        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: smoothEase }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid gap-6 bg-[linear-gradient(135deg,rgba(30,64,175,0.92),rgba(14,165,233,0.86),rgba(251,191,36,0.9))] p-8 text-white md:grid-cols-[1.3fr_0.9fr] md:p-10">
                <div className="space-y-4">
                  <Badge className="bg-white/20 text-white">Cart</Badge>
                  <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                    Shopping cart and checkout.
                  </h1>
                  <p className="max-w-2xl text-sm text-white/90 md:text-base">
                    Add items, adjust quantity, clear the cart, and checkout with
                    idempotency so duplicate submits do not create duplicate orders.
                  </p>
                </div>
                <div className="glass-panel space-y-3 p-5 text-slate-900">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                    Summary
                  </p>
                  <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                      Items
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {cart?.items.length ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/90 p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                      Total
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {formatMoney(orderTotal, cart?.currency ?? "VND")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionDiv>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.04, ease: smoothEase }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Cart items</CardTitle>
                <CardDescription>
                  Update quantities in place or remove items before checkout.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                {message ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {message}
                  </div>
                ) : null}

                {isEmpty ? (
                  <div className="space-y-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-6">
                    <p className="text-sm text-[var(--text-secondary)]">
                      Your cart is empty. Browse the store and add digital products or
                      open a product detail page to start a custom flow.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/store"
                        className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
                      >
                        Browse store
                      </Link>
                      <Link
                        href="/dashboard/orders"
                        className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                      >
                        My orders
                      </Link>
                    </div>
                  </div>
                ) : null}

                {!isEmpty
                  ? cart?.items.map((item) => {
                      const itemKey = cartItemKey(item);

                      return (
                        <div
                          key={itemKey}
                          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-1">
                              <p className="text-base font-semibold text-[var(--text-primary)]">
                                {item.productName}
                              </p>
                              <p className="text-xs text-[var(--text-secondary)]">
                                Slug: {item.productSlug}
                              </p>
                              <p className="text-xs text-[var(--text-secondary)]">
                                Unit price: {formatMoney(item.unitPrice, item.currency)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                                Line total
                              </p>
                              <p className="text-lg font-semibold text-[var(--text-primary)]">
                                {formatMoney(item.lineTotal, item.currency)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="space-y-1.5 sm:max-w-40">
                              <label className="text-sm font-medium text-[var(--text-primary)]">
                                Quantity
                              </label>
                              <Input
                                type="number"
                                min={1}
                                value={draftQuantities[itemKey] ?? item.quantity}
                                onChange={(event) =>
                                  setDraftQuantities((prev) => ({
                                    ...prev,
                                    [itemKey]: Number(event.target.value) || 1,
                                  }))
                                }
                              />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="secondary"
                                onClick={() => void handleUpdateItem(item)}
                                loading={activeItemId === itemKey}
                              >
                                Update
                              </Button>
                              <Button
                                variant="danger"
                                onClick={() => void handleRemoveItem(itemKey)}
                                loading={activeItemId === itemKey}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  : null}

                {!isEmpty ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={handleClearCart} loading={saving}>
                      Clear cart
                    </Button>
                    <Link
                      href="/store"
                      className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]"
                    >
                      Add more items
                    </Link>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.06, ease: smoothEase }}
          >
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick add</CardTitle>
                  <CardDescription>
                    Add a product by ID. Normal shopping should start from the store page.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-3" onSubmit={handleAddItem}>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[var(--text-primary)]">
                        Product ID
                      </label>
                      <Input
                        value={productId}
                        onChange={(event) => setProductId(event.target.value)}
                        placeholder="Mongo ObjectId of product"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[var(--text-primary)]">
                        Quantity
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(event) => setQuantity(Number(event.target.value) || 1)}
                      />
                    </div>
                    <Button type="submit" loading={saving}>
                      Add item
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-[var(--border)] bg-[linear-gradient(160deg,rgba(8,145,178,0.08),rgba(255,255,255,1))]">
                <CardHeader>
                  <CardTitle>Checkout summary</CardTitle>
                  <CardDescription>
                    Review totals and proceed to an order detail page after checkout.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[var(--border)] bg-white/80 p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Subtotal
                      </p>
                      <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                        {formatMoney(cart?.subtotal, cart?.currency ?? "VND")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-white/80 p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Total
                      </p>
                      <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                        {formatMoney(cart?.total, cart?.currency ?? "VND")}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    loading={checkoutLoading}
                    disabled={isEmpty}
                  >
                    Checkout cart
                  </Button>
                </CardContent>
              </Card>
            </div>
          </MotionDiv>
        </div>
      </MotionSection>
    </main>
  );
}
