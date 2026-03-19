"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
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
  buttonVariants,
} from "@/components/ui";
import {
  clearMyCart,
  checkoutCart,
  getMyCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/api/store";
import { cn } from "@/lib/utils";
import type {
  StoreCart,
  StoreCartCheckoutResult,
  StoreCartItem,
  StoreProduct,
  StoreProductType,
} from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

const LOCAL_CART_KEY = "vua-project.store.cart.v1";
const smoothEase = [0.22, 1, 0.36, 1] as const;

type CartSource = "remote" | "local";
type BannerTone = "neutral" | "success" | "warning" | "destructive";

interface BannerState {
  tone: BannerTone;
  message: string;
}

function formatCoins(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getItemName(item: StoreCartItem) {
  return (
    item.product?.name ??
    item.productName ??
    item.productSnapshot?.name ??
    "Untitled product"
  );
}

function getCartItemId(item: StoreCartItem) {
  return item._id ?? item.id ?? "";
}

function getItemSlug(item: StoreCartItem) {
  return item.product?.slug ?? item.productSlug ?? item.productSnapshot?.slug ?? "";
}

function getItemType(item: StoreCartItem): StoreProductType | undefined {
  return item.product?.type ?? item.productType ?? item.productSnapshot?.type;
}

function getItemImage(item: StoreCartItem) {
  const product = item.product as StoreProduct | null | undefined;
  return product?.images?.[0]?.url ?? item.productImage ?? item.productSnapshot?.image ?? "";
}

function getItemDescription(item: StoreCartItem) {
  return (
    item.product?.shortDescription ??
    item.product?.description ??
    item.productSnapshot?.shortDescription ??
    ""
  );
}

function getItemBasePrice(item: StoreCartItem) {
  const product = item.product as StoreProduct | null | undefined;
  const directPrice = item.unitPrice ?? product?.price ?? item.productSnapshot?.price;
  return typeof directPrice === "number" ? directPrice : 0;
}

function getItemLineTotal(item: StoreCartItem) {
  if (typeof item.totalPrice === "number") {
    return item.totalPrice;
  }

  return getItemBasePrice(item) * Math.max(1, item.quantity || 1);
}

function getItemOriginalLineTotal(item: StoreCartItem) {
  const product = item.product as StoreProduct | null | undefined;
  const originalPrice = product?.originalPrice ?? item.productSnapshot?.originalPrice;

  if (typeof originalPrice !== "number") {
    return undefined;
  }

  return originalPrice * Math.max(1, item.quantity || 1);
}

function getItemMaxQuantity(item: StoreCartItem) {
  const product = item.product as StoreProduct | null | undefined;
  const type = getItemType(item);

  if (type === "custom_order") {
    return 1;
  }

  const stockCap = typeof product?.stock === "number" && product.stock > 0 ? product.stock : 20;
  const perUserCap =
    typeof product?.maxPerUser === "number" && product.maxPerUser > 0
      ? product.maxPerUser
      : 20;

  return Math.max(1, Math.min(stockCap, perUserCap));
}

function getTypeBadge(type?: StoreProductType) {
  if (type === "digital") {
    return { label: "Digital", variant: "accent" as const };
  }

  if (type === "custom_order") {
    return { label: "Custom", variant: "default" as const };
  }

  return { label: "Item", variant: "default" as const };
}

function normalizeCartItem(item: StoreCartItem, selectedOverride?: boolean): StoreCartItem {
  const quantity = Math.max(1, Math.floor(item.quantity || 1));
  const unitPrice = getItemBasePrice(item);
  const totalPrice = typeof item.totalPrice === "number" ? item.totalPrice : unitPrice * quantity;

  return {
    ...item,
    quantity,
    unitPrice,
    totalPrice,
    selected: selectedOverride ?? item.selected ?? true,
  };
}

function normalizeCart(cart?: StoreCart | null, reference?: StoreCart): StoreCart {
  const selectedMap = new Map(
    reference?.items.map((item) => [getCartItemId(item), item.selected ?? true]) ?? [],
  );

  return {
    ...cart,
    items: (cart?.items ?? []).map((item) =>
      normalizeCartItem(item, selectedMap.get(getCartItemId(item))),
    ),
  };
}

function computeCartSummary(cart: StoreCart) {
  const subtotal = cart.items.reduce((total, item) => total + getItemLineTotal(item), 0);
  const selectedItems = cart.items.filter((item) => item.selected ?? true);
  const selectedSubtotal = selectedItems.reduce(
    (total, item) => total + getItemLineTotal(item),
    0,
  );

  return {
    itemCount: cart.items.length,
    selectedCount: selectedItems.length,
    subtotal,
    selectedSubtotal,
    currency: cart.summary?.currency ?? "coin",
  };
}

function readLocalCart(): StoreCart {
  if (typeof window === "undefined") {
    return { items: [] };
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_CART_KEY);
    if (!raw) {
      return { items: [] };
    }

    const parsed = JSON.parse(raw) as StoreCart;
    return normalizeCart(parsed);
  } catch {
    return { items: [] };
  }
}

function writeLocalCart(cart: StoreCart) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
}

function resolveCheckoutResultMessage(result: StoreCartCheckoutResult | null) {
  if (!result) {
    return "";
  }

  return (
    result.message ??
    `Checkout completed with ${result.successItems?.length ?? 0} successful item(s).`
  );
}

function CartBanner({ tone, message }: BannerState) {
  const toneClasses: Record<BannerTone, string> = {
    neutral: "border-slate-200 bg-white text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    destructive: "border-rose-200 bg-rose-50 text-rose-700",
  };

  if (!message) {
    return null;
  }

  return (
    <Card className={cn("border", toneClasses[tone])}>
      <CardContent className="flex items-start gap-3 p-4 text-sm">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{message}</p>
      </CardContent>
    </Card>
  );
}

function CartEmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center md:px-10">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-700">
          <ShoppingCart className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-900">Your cart is empty</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Add a digital product or custom service from the store, then come back here to
          review quantity, selection, and coin checkout in one place.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/store" className={buttonVariants({ variant: "default" })}>
            Browse store
          </Link>
          <Link href="/store" className={buttonVariants({ variant: "outline" })}>
            Back to products
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

interface CartItemCardProps {
  item: StoreCartItem;
  checked: boolean;
  maxQuantity: number;
  onToggleSelected: (itemId: string, next: boolean) => void;
  onQuantityChange: (itemId: string, next: number) => void;
  onRemove: (itemId: string) => void;
}

function CartItemCard({
  item,
  checked,
  maxQuantity,
  onToggleSelected,
  onQuantityChange,
  onRemove,
}: CartItemCardProps) {
  const type = getItemType(item);
  const typeBadge = getTypeBadge(type);
  const image = getItemImage(item);
  const name = getItemName(item);
  const slug = getItemSlug(item);
  const description = getItemDescription(item);
  const lineTotal = getItemLineTotal(item);
  const originalLineTotal = getItemOriginalLineTotal(item);
  const instantDelivery = type === "digital";

  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-4 p-4 md:grid-cols-[160px_1fr] md:p-5">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <div className="aspect-[4/3]">
            {image ? (
              <Image
                src={image}
                alt={name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 160px"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-cyan-100 via-sky-100 to-amber-100 text-slate-900">
                <ShoppingCart className="h-8 w-8 opacity-80" />
              </div>
            )}
          </div>
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
            {instantDelivery ? <Badge variant="accent">Instant</Badge> : <Badge>Quote</Badge>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    checked={checked}
                    onChange={(event) =>
                      onToggleSelected(getCartItemId(item), event.target.checked)
                    }
                  />
                  Selected
                </label>
                <Badge variant={checked ? "accent" : "default"}>
                  {checked ? "Included" : "Skipped"}
                </Badge>
              </div>

              {slug ? (
                <Link
                  href={`/store/${slug}`}
                  className="text-lg font-semibold leading-tight text-slate-950 transition hover:text-cyan-700"
                >
                  {name}
                </Link>
              ) : (
                <h3 className="text-lg font-semibold leading-tight text-slate-950">{name}</h3>
              )}

              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                {description ||
                  "Review this item before checkout. Quantity and selection stay editable here."}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="self-start text-slate-500 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => onRemove(getCartItemId(item))}
              aria-label={`Remove ${name} from cart`}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Item price</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-lg font-semibold text-slate-950">
                      {formatCoins(lineTotal)} coin
                    </span>
                    {originalLineTotal && originalLineTotal > lineTotal ? (
                      <span className="text-sm text-slate-400 line-through">
                        {formatCoins(originalLineTotal)} coin
                      </span>
                    ) : null}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Unit price</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {formatCoins(getItemBasePrice(item))} coin
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>{instantDelivery ? "Instant delivery" : "Quote available"}</span>
                <span className="hidden sm:inline">|</span>
                <span>Max {maxQuantity}</span>
                <span className="hidden sm:inline">|</span>
                <span>Updated {formatDateTime(item.updatedAt)}</span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl"
                disabled={item.quantity <= 1}
                onClick={() => onQuantityChange(getCartItemId(item), item.quantity - 1)}
                aria-label={`Decrease quantity for ${name}`}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="min-w-12 px-2 text-center text-sm font-semibold text-slate-900">
                {item.quantity}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl"
                disabled={item.quantity >= maxQuantity}
                onClick={() => onQuantityChange(getCartItemId(item), item.quantity + 1)}
                aria-label={`Increase quantity for ${name}`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SummaryCardProps {
  itemCount: number;
  selectedCount: number;
  subtotal: number;
  selectedSubtotal: number;
  balance: number;
  insufficientBalance: boolean;
  checkoutLoading: boolean;
  userReady: boolean;
  onCheckout: () => void;
  onClear: () => void;
}

function SummaryCard({
  itemCount,
  selectedCount,
  subtotal,
  selectedSubtotal,
  balance,
  insufficientBalance,
  checkoutLoading,
  userReady,
  onCheckout,
  onClear,
}: SummaryCardProps) {
  const remaining = balance - selectedSubtotal;

  return (
    <Card className="lg:sticky lg:top-24">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="accent">Checkout</Badge>
          <Badge>
            {selectedCount}/{itemCount} selected
          </Badge>
        </div>
        <CardTitle>Order summary</CardTitle>
        <CardDescription>
          Keep the page focused on conversion: one list, one summary, one action.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-semibold text-slate-950">{formatCoins(subtotal)} coin</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-500">Selected subtotal</span>
            <span className="font-semibold text-slate-950">
              {formatCoins(selectedSubtotal)} coin
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-500">Wallet balance</span>
            <span className="font-semibold text-slate-950">{formatCoins(balance)} coin</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-500">After checkout</span>
            <span
              className={cn(
                "font-semibold",
                remaining >= 0 ? "text-emerald-700" : "text-rose-700",
              )}
            >
              {remaining >= 0
                ? `${formatCoins(remaining)} coin left`
                : `Need ${formatCoins(Math.abs(remaining))} more`}
            </span>
          </div>
        </div>

        {!userReady ? (
          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
                <p className="text-sm leading-6 text-slate-600">
                  Sign in to checkout with your wallet and unlock coin payment.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-cyan-600 px-4 text-sm font-semibold text-white transition hover:bg-cyan-500"
              >
                Sign in to checkout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        ) : insufficientBalance ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <p className="text-sm leading-6 text-amber-900">
                  You need more coins to place this order. Top up first, then come back and
                  finish checkout.
                </p>
              </div>
              <Link
                href="/wallet/deposit"
                className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-amber-500 px-4 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
              >
                Deposit coins
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Button
            className="h-11 w-full"
            onClick={onCheckout}
            disabled={checkoutLoading || selectedCount === 0}
          >
            {checkoutLoading ? "Checking out..." : "Checkout selected items"}
            {!checkoutLoading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
          </Button>
        )}

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="flex-1" onClick={onClear} disabled={!itemCount}>
            Clear cart
          </Button>
          <Link
            href="/store"
            className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to store
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

interface ResultBlockProps {
  result: StoreCartCheckoutResult | null;
}

function ResultBlock({ result }: ResultBlockProps) {
  if (!result) {
    return null;
  }

  const successItems = result.successItems ?? [];
  const failedItems = result.failedItems ?? [];
  const message = resolveCheckoutResultMessage(result);

  return (
    <Card className="overflow-hidden border-cyan-200 bg-gradient-to-br from-white to-cyan-50/40">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="accent">Checkout result</Badge>
          <Badge>{successItems.length} success</Badge>
          {failedItems.length ? (
            <Badge variant="destructive">{failedItems.length} failed</Badge>
          ) : null}
        </div>
        <CardTitle>{message}</CardTitle>
        <CardDescription>
          Review the item-level results before you leave this page. Failed items stay in the cart.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {successItems.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {successItems.map((item) => (
              <div
                key={`${item.productId}-${item.itemId ?? item.orderId ?? item.orderNumber ?? item.quantity}`}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      <p className="font-semibold text-emerald-900">
                        {item.productName ?? item.productId}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-emerald-800">
                      Quantity {item.quantity}
                      {item.orderNumber ? ` � Order ${item.orderNumber}` : ""}
                    </p>
                  </div>
                  <Badge variant="accent">Success</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-emerald-800">
                  {item.message ?? item.reason ?? "Checkout line completed."}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {failedItems.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {failedItems.map((item) => (
              <div
                key={`${item.productId}-${item.itemId ?? item.productName ?? item.quantity}`}
                className="rounded-2xl border border-rose-200 bg-rose-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-rose-700" />
                      <p className="font-semibold text-rose-900">
                        {item.productName ?? item.productId}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-rose-800">Quantity {item.quantity}</p>
                  </div>
                  <Badge variant="destructive">Failed</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-rose-800">
                  {item.message ?? item.reason ?? "Checkout line failed."}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function CartPage() {
  const { user, initializing } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<StoreCart>({ items: [] });
  const [source, setSource] = useState<CartSource>("remote");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<StoreCartCheckoutResult | null>(null);

  const cartSummary = useMemo(() => computeCartSummary(cart), [cart]);
  const balance = user?.wallet?.balance ?? 0;
  const userReady = !initializing && Boolean(user);
  const insufficientBalance =
    Boolean(user) && cartSummary.selectedCount > 0 && cartSummary.selectedSubtotal > balance;
  const allSelected = cart.items.length > 0 && cart.items.every((item) => item.selected ?? true);
  const someSelected =
    cart.items.some((item) => item.selected ?? true) && !allSelected;
  const selectedItems = useMemo(
    () => cart.items.filter((item) => item.selected ?? true),
    [cart.items],
  );

  const persistCart = useCallback(
    (nextCart: StoreCart, reference?: StoreCart, nextSource?: CartSource) => {
      const normalized = normalizeCart(nextCart, reference);
      setCart(normalized);
      writeLocalCart(normalized);
      if (nextSource) {
        setSource(nextSource);
      }
      return normalized;
    },
    [],
  );

  const setBannerMessage = useCallback((tone: BannerTone, message: string) => {
    setBanner(message ? { tone, message } : null);
  }, []);

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getMyCart();
      const normalized = persistCart(response ?? { items: [] }, undefined, "remote");
      if (!normalized.items.length) {
        setBanner(null);
      }
    } catch {
      const localCart = readLocalCart();
      persistCart(localCart, undefined, "local");
      if (localCart.items.length) {
        setBannerMessage(
          "warning",
          "Using your local cart draft while the cart API is unavailable.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [persistCart, setBannerMessage]);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  function handleToggleSelected(itemId: string, next: boolean) {
    setCart((current) => {
      const nextCart = {
        ...current,
        items: current.items.map((item) =>
          getCartItemId(item) === itemId ? { ...item, selected: next } : item,
        ),
      };
      const normalized = normalizeCart(nextCart, current);
      writeLocalCart(normalized);
      return normalized;
    });
    setCheckoutResult(null);
  }

  async function handleQuantityChange(itemId: string, nextQuantity: number) {
    const currentCart = cart;
    const nextCount = Math.max(1, nextQuantity);
    const nextCart = {
      ...currentCart,
      items: currentCart.items.map((item) =>
        getCartItemId(item) === itemId
          ? {
              ...item,
              quantity: nextCount,
              totalPrice: getItemBasePrice(item) * nextCount,
            }
          : item,
      ),
    };

    persistCart(nextCart, currentCart, source);
    setCheckoutResult(null);

    if (source !== "remote") {
      return;
    }

    try {
      const response = await updateCartItem(itemId, { quantity: nextCount });
      if (response) {
        persistCart(response, nextCart, "remote");
      }
    } catch (error) {
      setSource("local");
      setBannerMessage(
        "warning",
        error instanceof Error
          ? error.message
          : "Cart API update failed. Keeping the local draft in sync.",
      );
    }
  }

  async function handleRemoveItem(itemId: string) {
    const currentCart = cart;
    const nextCart = {
      ...currentCart,
      items: currentCart.items.filter((item) => getCartItemId(item) !== itemId),
    };

    persistCart(nextCart, currentCart, source);
    setCheckoutResult(null);

    if (source !== "remote") {
      return;
    }

    try {
      const response = await removeCartItem(itemId);
      if (response) {
        persistCart(response, nextCart, "remote");
      }
    } catch (error) {
      setSource("local");
      setBannerMessage(
        "warning",
        error instanceof Error
          ? error.message
          : "Cart API remove failed. Using the local cart draft instead.",
      );
    }
  }

  async function handleClearCart() {
    const nextCart = { ...cart, items: [] };
    persistCart(nextCart, cart, source);
    setCheckoutResult(null);

    if (source !== "remote") {
      return;
    }

    try {
      const response = await clearMyCart();
      if (response) {
        persistCart(response, nextCart, "remote");
      }
    } catch (error) {
      setSource("local");
      setBannerMessage(
        "warning",
        error instanceof Error
          ? error.message
          : "Cart API clear failed. The local cart has been cleared instead.",
      );
    }
  }

  async function handleCheckout() {
    if (!user) {
      router.push("/login");
      return;
    }

    const selectedItemIds = cart.items
      .filter((item) => item.selected ?? true)
      .map((item) => getCartItemId(item))
      .filter((itemId) => itemId.length > 0);

    if (!selectedItemIds.length) {
      setBannerMessage("neutral", "Select at least one item before checkout.");
      return;
    }

    if (insufficientBalance) {
      setBannerMessage(
        "warning",
        "Your wallet balance is not enough for the selected cart items.",
      );
      return;
    }

    setCheckoutLoading(true);
    setBanner(null);

    try {
      const result = await checkoutCart({
        itemIds: selectedItemIds,
      });

      setCheckoutResult(result ?? null);

      if (result?.cart) {
        persistCart(result.cart, cart, "remote");
      } else {
        const remainingItems = cart.items.filter(
          (item) => !selectedItemIds.includes(getCartItemId(item)),
        );
        persistCart({ ...cart, items: remainingItems }, cart, source);
      }

      setBannerMessage("success", resolveCheckoutResultMessage(result ?? null));
    } catch (error) {
      setBannerMessage(
        "destructive",
        error instanceof Error ? error.message : "Unable to checkout cart.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  function handleSelectAll(next: boolean) {
    const nextCart = {
      ...cart,
      items: cart.items.map((item) => ({ ...item, selected: next })),
    };

    persistCart(nextCart, cart, source);
    setCheckoutResult(null);
  }

  return (
    <main className="pb-16 pt-0">
      <MotionSection
        className="relative isolate overflow-hidden bg-gradient-to-br from-cyan-100 via-sky-100 to-amber-100 text-slate-900"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: smoothEase }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
        </div>
        <div className="section-shell relative py-14 lg:px-16 lg:py-20 xl:px-20">
          <Card className="overflow-hidden border-white/10 bg-white/80 text-slate-800 shadow-2xl shadow-slate-950/20 backdrop-blur">
            <CardContent className="grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
            <MotionDiv
              className="space-y-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.04, ease: smoothEase }}
            >
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-cyan-100 text-cyan-700">Cart</Badge>
                <Badge className="bg-white/80 text-slate-800">Coin checkout</Badge>
                <Badge className="bg-white/80 text-slate-800">Premium flow</Badge>
              </div>
              <h1 className="max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
                Review selected items, keep quantity tight, and check out in one clean step.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-700 md:text-base">
                The cart is intentionally compact. No marketplace noise, no seller clutter,
                just product clarity, wallet awareness, and a fast path to checkout.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/store"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Browse store
                </Link>
                <Button
                  variant="outline"
                  className="border-white/30 bg-white/5 text-slate-800 hover:bg-cyan-50"
                  onClick={() =>
                    document.getElementById("cart-items")?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Review items
                </Button>
              </div>
            </MotionDiv>

            <MotionDiv
              className="grid gap-3 rounded-3xl border border-cyan-200/80 bg-white/80 p-5 backdrop-blur"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.08, ease: smoothEase }}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-700">
                Cart snapshot
              </p>
              <div className="grid gap-3">
                {[
                  { label: "Items in cart", value: String(cartSummary.itemCount) },
                  {
                    label: "Selected subtotal",
                    value: `${formatCoins(cartSummary.selectedSubtotal)} coin`,
                  },
                  { label: "Wallet balance", value: `${formatCoins(balance)} coin` },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/78 p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/78 p-4 text-sm text-slate-700">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4" />
                  Premium and minimal by design
                </div>
                <p className="mt-2 leading-6">
                  One screen for item review, one summary for decision-making, and one CTA for
                  checkout.
                </p>
              </div>
            </MotionDiv>
            </CardContent>
          </Card>
        </div>
      </MotionSection>

      <MotionSection
        className="section-shell mt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: smoothEase }}
      >
        <CartBanner tone={banner?.tone ?? "neutral"} message={banner?.message ?? ""} />
      </MotionSection>

      {loading ? (
        <div className="section-shell mt-8 flex justify-center py-10">
          <Spinner label="Loading cart" />
        </div>
      ) : null}

      {!loading && !cart.items.length ? (
        <MotionSection
          className="section-shell mt-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: smoothEase }}
        >
          <CartEmptyState />
        </MotionSection>
      ) : null}

      {!loading && cart.items.length ? (
        <>
          <MotionSection
            id="cart-items"
            className="section-shell mt-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: smoothEase }}
          >
            <Card>
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <CardTitle>Cart items</CardTitle>
                    <CardDescription>
                      Quantity changes are instant, selection stays local, and checkout uses
                      your coin wallet.
                    </CardDescription>
                  </div>
                  <Badge variant="accent">
                    {selectedItems.length} selected of {cart.items.length}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" size="sm" onClick={() => handleSelectAll(!allSelected)}>
                    {allSelected ? "Deselect all" : someSelected ? "Select all" : "Select all"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClearCart}>
                    Clear cart
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-4">
                    {cart.items.map((item) => (
                      <CartItemCard
                        key={getCartItemId(item) || `${item.productId}-${item.createdAt ?? "item"}`}
                        item={item}
                        checked={item.selected ?? true}
                        maxQuantity={getItemMaxQuantity(item)}
                        onToggleSelected={handleToggleSelected}
                        onQuantityChange={handleQuantityChange}
                        onRemove={handleRemoveItem}
                      />
                    ))}
                  </div>

                  <SummaryCard
                    itemCount={cartSummary.itemCount}
                    selectedCount={cartSummary.selectedCount}
                    subtotal={cartSummary.subtotal}
                    selectedSubtotal={cartSummary.selectedSubtotal}
                    balance={balance}
                    insufficientBalance={insufficientBalance}
                    checkoutLoading={checkoutLoading}
                    userReady={userReady}
                    onCheckout={handleCheckout}
                    onClear={handleClearCart}
                  />
                </div>
              </CardContent>
            </Card>
          </MotionSection>

          <MotionSection
            className="section-shell mt-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: smoothEase }}
          >
            <ResultBlock result={checkoutResult} />
          </MotionSection>

          <MotionSection
            className="section-shell mt-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: smoothEase }}
          >
            <Card className="overflow-hidden bg-white/80">
              <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="accent">Support</Badge>
                    <Badge>FAQ ready</Badge>
                  </div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Need help before checkout?
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600">
                    Open a ticket if you need product clarification, billing help, or custom
                    order guidance.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/tickets/new"
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-cyan-600 px-4 text-sm font-semibold text-white transition hover:bg-cyan-500"
                  >
                    Create ticket
                  </Link>
                  <Link
                    href="/store"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Continue shopping
                  </Link>
                </div>
              </CardContent>
            </Card>
          </MotionSection>
        </>
      ) : null}

      {source === "local" && cart.items.length ? (
        <MotionSection
          className="section-shell mt-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: smoothEase }}
        >
          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="flex items-start gap-3 p-4 text-sm text-slate-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>
                The page is currently using your local cart draft. Once the backend cart API is
                available, this view will sync remotely.
              </p>
            </CardContent>
          </Card>
        </MotionSection>
      ) : null}
    </main>
  );
}

