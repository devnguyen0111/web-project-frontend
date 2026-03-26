"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Crown, Search, Sparkles, Star } from "lucide-react";
import { PaginationControls } from "@/components/common/pagination-controls";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select,
  Spinner,
} from "@/components/ui";
import {
  listStoreCategories,
  listStoreProducts,
  type ProductSortBy,
} from "@/lib/api/products";
import {
  formatCoinLabel,
  formatFileSize,
  formatFileType,
  getUserStoreDiscountPercent,
  isVipActive,
  resolveStorePriceDisplay,
  toStoredPriceFromCoin,
} from "@/lib/format/store-pricing";
import type { Category, PaginatedResult, StoreProduct } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

const PAGE_SIZE = 20;

type ProductKindFilter = "all" | "digital" | "custom_order";
type VipFilter = "all" | "vip_only" | "non_vip";

const SORT_OPTIONS: Array<{ value: ProductSortBy; label: string }> = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Best sellers" },
  { value: "rating", label: "Highest rated" },
  { value: "price_asc", label: "Coin price: low to high" },
  { value: "price_desc", label: "Coin price: high to low" },
];

function RatingStars({ value }: { value: number }) {
  const normalized = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => {
        const active = index < normalized;
        return (
          <Star
            key={`star-${index}`}
            className={`h-3.5 w-3.5 ${
              active
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-slate-300"
            }`}
          />
        );
      })}
    </div>
  );
}

function ProductTypeBadge({ type }: { type: StoreProduct["type"] }) {
  if (type === "digital") {
    return (
      <span className="rounded-full bg-sky-600/90 px-2 py-1 text-[11px] font-semibold text-white">
        Digital
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-500/90 px-2 py-1 text-[11px] font-semibold text-white">
      Custom Order
    </span>
  );
}

function parseCoinInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function StoreProductCard({
  product,
  discountPercent,
  vipActive,
}: {
  product: StoreProduct;
  discountPercent: number;
  vipActive: boolean;
}) {
  const pricing = resolveStorePriceDisplay(product, discountPercent);
  const metrics = product.metrics;
  const lockedByVip = Boolean(product.vipOnly) && !vipActive;
  const rating = metrics?.averageRating ?? 0;
  const reviewCount = metrics?.reviewCount ?? 0;
  const soldCount = metrics?.soldCount ?? 0;
  const fileType = formatFileType(
    product.digitalAsset?.mimeType,
    product.digitalAsset?.fileName,
  );
  const fileSize = formatFileSize(product.digitalAsset?.size);

  return (
    <article className="group surface-card relative overflow-hidden">
      <div className="relative aspect-video overflow-hidden border-b border-[var(--border)] bg-[radial-gradient(circle_at_10%_20%,rgba(14,116,144,0.24),transparent_42%),radial-gradient(circle_at_80%_10%,rgba(124,58,237,0.2),transparent_46%),linear-gradient(145deg,#f8fafc,#e2e8f0)]">
        <div className="absolute left-2 top-2 flex flex-wrap items-center gap-1.5">
          <ProductTypeBadge type={product.type} />
          {product.vipOnly ? (
            <span className="rounded-full bg-violet-600/90 px-2 py-1 text-[11px] font-semibold text-white">
              VIP Only
            </span>
          ) : null}
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
          <span className="rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-700">
            {soldCount} sold
          </span>
          <Link
            href={`/store/${product.slug}`}
            className="inline-flex min-h-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-3 text-xs font-semibold text-white opacity-100 shadow-sm transition md:opacity-0 md:group-hover:opacity-100"
          >
            {lockedByVip ? "VIP required" : "Buy now"}
          </Link>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">
          {product.name}
        </h3>

        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {formatCoinLabel(pricing.finalCoins)} coin
            </p>
            {pricing.hasDiscount ? (
              <p className="text-xs text-[var(--text-muted)]">
                <span className="line-through">{formatCoinLabel(pricing.baseCoins)} coin</span>{" "}
                <span className="font-semibold text-emerald-600">-{pricing.appliedDiscountPercent}%</span>
              </p>
            ) : null}
          </div>

          <div className="text-right">
            <div className="flex justify-end">
              <RatingStars value={rating} />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {rating.toFixed(1)} ({reviewCount} review)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 text-[11px] text-[var(--text-secondary)]">
          {product.type === "digital" ? (
            <>
              <span className="rounded-full bg-[var(--surface-muted)] px-2 py-1">{fileType}</span>
              <span className="rounded-full bg-[var(--surface-muted)] px-2 py-1">{fileSize}</span>
            </>
          ) : (
            <span className="rounded-full bg-[var(--surface-muted)] px-2 py-1">Quote on request</span>
          )}
          {lockedByVip ? (
            <span className="rounded-full bg-violet-100 px-2 py-1 font-semibold text-violet-700">
              VIP required to purchase
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function StorePage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [result, setResult] = useState<PaginatedResult<StoreProduct> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [minCoinInput, setMinCoinInput] = useState("");
  const [maxCoinInput, setMaxCoinInput] = useState("");

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedMinCoin, setAppliedMinCoin] = useState<string>("");
  const [appliedMaxCoin, setAppliedMaxCoin] = useState<string>("");

  const [categoryId, setCategoryId] = useState("all");
  const [productKind, setProductKind] = useState<ProductKindFilter>("all");
  const [vipFilter, setVipFilter] = useState<VipFilter>("all");
  const [sortBy, setSortBy] = useState<ProductSortBy>("newest");

  const vipActive = isVipActive(user);
  const discountPercent = getUserStoreDiscountPercent(user);

  const queryVipOnly =
    vipFilter === "vip_only" ? true : vipFilter === "non_vip" ? false : undefined;

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const storeCategories = await listStoreCategories();
        if (!mounted) {
          return;
        }
        setCategories(storeCategories);
      } catch {
        if (!mounted) {
          return;
        }
        setCategories([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const minCoin = parseCoinInput(appliedMinCoin);
    const maxCoin = parseCoinInput(appliedMaxCoin);

    void (async () => {
      setLoading(true);
      setError("");

      try {
        const data = await listStoreProducts({
          page,
          limit: PAGE_SIZE,
          search: appliedSearch || undefined,
          type: productKind === "all" ? undefined : productKind,
          categoryId: categoryId === "all" ? undefined : categoryId,
          vipOnly: queryVipOnly,
          minPrice:
            typeof minCoin === "number" ? toStoredPriceFromCoin(minCoin) : undefined,
          maxPrice:
            typeof maxCoin === "number" ? toStoredPriceFromCoin(maxCoin) : undefined,
          sortBy,
        });

        if (!mounted) {
          return;
        }

        setResult(data);
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setError(
          loadError instanceof Error ? loadError.message : "Unable to load the product list",
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [
    appliedMaxCoin,
    appliedMinCoin,
    appliedSearch,
    categoryId,
    page,
    productKind,
    queryVipOnly,
    sortBy,
  ]);

  const totalItems = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;
  const products = result?.data ?? [];

  const activeCategoryLabel = useMemo(() => {
    if (categoryId === "all") {
      return "All categories";
    }

    return categories.find((category) => category._id === categoryId)?.name ?? "Category";
  }, [categories, categoryId]);

  function handleApplySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
    setAppliedMinCoin(minCoinInput.trim());
    setAppliedMaxCoin(maxCoinInput.trim());
    setPage(1);
  }

  function resetFilters() {
    setSearchInput("");
    setMinCoinInput("");
    setMaxCoinInput("");
    setAppliedSearch("");
    setAppliedMinCoin("");
    setAppliedMaxCoin("");
    setCategoryId("all");
    setProductKind("all");
    setVipFilter("all");
    setSortBy("newest");
    setPage(1);
  }

  return (
    <main className="pb-14">
      <section className="overflow-hidden bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_45%,#14b8a6_100%)] pb-14 pt-12 text-white">
        <div className="section-shell space-y-6">
          <Badge className="w-fit border border-white/25 bg-white/10 text-white">
            Marketplace
          </Badge>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold md:text-5xl">Digital Store</h1>
            <p className="max-w-3xl text-sm text-white/90 md:text-base">
              Browse products quickly, pay with coins, and instantly receive digital assets or submit a custom order request.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => {
                setVipFilter("vip_only");
                setPage(1);
                document.getElementById("store-grid")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <Sparkles className="h-4 w-4" />
              Explore VIP deals
            </Button>
            <Link href="/cart">
              <Button
                variant="secondary"
                className="border-white/35 bg-white/10 text-white hover:bg-white/20"
              >
                Open cart
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="section-shell mt-6 space-y-6">
        <Card className="sticky top-[68px] z-30 border-[var(--border)] bg-[var(--surface)]/95 shadow-sm backdrop-blur">
          <CardContent className="p-3 md:p-4">
            <form className="grid gap-3" onSubmit={handleApplySearch}>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search by name or description"
                    className="pl-9"
                  />
                </div>
                <Input
                  value={minCoinInput}
                  onChange={(event) => setMinCoinInput(event.target.value)}
                  placeholder="Min coins"
                  type="number"
                  min={0}
                />
                <Input
                  value={maxCoinInput}
                  onChange={(event) => setMaxCoinInput(event.target.value)}
                  placeholder="Max coins"
                  type="number"
                  min={0}
                />
                <Button type="submit">Apply</Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Select
                  value={categoryId}
                  onChange={(event) => {
                    setCategoryId(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </Select>

                <Select
                  value={productKind}
                  onChange={(event) => {
                    setProductKind(event.target.value as ProductKindFilter);
                    setPage(1);
                  }}
                >
                  <option value="all">All product types</option>
                  <option value="digital">Digital</option>
                  <option value="custom_order">Custom Order</option>
                </Select>

                <Select
                  value={vipFilter}
                  onChange={(event) => {
                    setVipFilter(event.target.value as VipFilter);
                    setPage(1);
                  }}
                >
                  <option value="all">All access levels</option>
                  <option value="vip_only">VIP only</option>
                  <option value="non_vip">Non-VIP</option>
                </Select>

                <Select
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value as ProductSortBy);
                    setPage(1);
                  }}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>

                <Button type="button" variant="secondary" onClick={resetFilters}>
                  Reset filters
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-[168px] space-y-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Categories</h2>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryId("all");
                    setPage(1);
                  }}
                  className={`w-full rounded-[var(--radius-md)] px-3 py-2 text-left text-sm transition ${
                    categoryId === "all"
                      ? "bg-[var(--primary-soft)] font-semibold text-[var(--primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  All categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category._id}
                    type="button"
                    onClick={() => {
                      setCategoryId(category._id);
                      setPage(1);
                    }}
                    className={`w-full rounded-[var(--radius-md)] px-3 py-2 text-left text-sm transition ${
                      categoryId === category._id
                        ? "bg-[var(--primary-soft)] font-semibold text-[var(--primary)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              <div className="border-t border-[var(--border)] pt-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  User status
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {vipActive
                    ? `You are a VIP member, with a ${discountPercent}% discount on digital products.`
                    : "You are not a VIP yet, so you can still view VIP-only items but purchasing is locked."}
                </p>
              </div>
            </div>
          </aside>

          <section id="store-grid" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">{activeCategoryLabel}</p>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {totalItems.toLocaleString("en-US")} products
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                {queryVipOnly === true ? (
                  <span className="rounded-full bg-violet-100 px-2 py-1 font-semibold text-violet-700">
                    Filtering VIP only
                  </span>
                ) : null}
                {appliedSearch ? (
                  <span className="rounded-full bg-[var(--surface-muted)] px-2 py-1">
                    Keyword: {appliedSearch}
                  </span>
                ) : null}
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-[260px] items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
                <Spinner label="Loading products" />
              </div>
            ) : null}

            {error ? (
              <div className="rounded-[var(--radius-lg)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            ) : null}

            {!loading && !error && products.length === 0 ? (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-12 text-center">
                <p className="text-sm text-[var(--text-secondary)]">
                  No products match the current filters.
                </p>
              </div>
            ) : null}

            {!loading && !error && products.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {products.map((product) => (
                  <StoreProductCard
                    key={product._id}
                    product={product}
                    discountPercent={discountPercent}
                    vipActive={vipActive}
                  />
                ))}
              </div>
            ) : null}

            <PaginationControls
              page={page}
              totalPages={Math.max(1, totalPages)}
              totalItems={totalItems}
              itemLabel="products"
              onPageChange={setPage}
              disabled={loading}
            />
          </section>
        </div>

        {!vipActive ? (
          <Card className="border-violet-200 bg-violet-50">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-start gap-2">
                <Crown className="mt-0.5 h-5 w-5 text-violet-600" />
                <div>
                  <p className="text-sm font-semibold text-violet-900">
                    Upgrade to VIP to unlock exclusive deals
                  </p>
                  <p className="text-sm text-violet-700">
                    VIP members get 10% off digital products and priority support.
                  </p>
                </div>
              </div>
              <Link href="/subscription">
                <Button className="bg-violet-600 hover:bg-violet-700">Upgrade to VIP</Button>
              </Link>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
