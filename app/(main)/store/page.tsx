"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { MotionDiv, MotionSection } from "@/components/motion";
import { StoreProductCard } from "@/components/store/store-product-card";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Spinner,
} from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { addCartItem, listProducts } from "@/lib/api/store";
import { cn } from "@/lib/utils";
import type {
  PaginatedResult,
  StoreProduct,
  StoreProductType,
} from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

const PAGE_SIZE = 12;
const smoothEase = [0.22, 1, 0.36, 1] as const;

type SortKey = "featured" | "popular" | "rating" | "newest" | "price_asc" | "price_desc";

function formatCoins(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function getTimestamp(value?: string) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getProductScore(product: StoreProduct) {
  return [
    Boolean(product.isFeatured) ? 1 : 0,
    product.salesCount ?? 0,
    product.rating ?? 0,
    product.reviewsCount ?? 0,
    getTimestamp(product.updatedAt),
  ] as const;
}

function compareProducts(a: StoreProduct, b: StoreProduct, sortBy: SortKey) {
  switch (sortBy) {
    case "popular":
      return (b.salesCount ?? 0) - (a.salesCount ?? 0) || getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt);
    case "rating":
      return (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0);
    case "newest":
      return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
    case "price_asc":
      return a.price - b.price || getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt);
    case "price_desc":
      return b.price - a.price || getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt);
    case "featured":
    default: {
      const aScore = getProductScore(a);
      const bScore = getProductScore(b);

      for (let index = 0; index < bScore.length; index += 1) {
        const delta = bScore[index] - aScore[index];
        if (delta !== 0) {
          return delta;
        }
      }

      return 0;
    }
  }
}

function ScrollLink({
  children,
  href,
  className,
}: {
  children: ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
    >
      {children}
    </a>
  );
}

export default function StorePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [productsResponse, setProductsResponse] = useState<
    PaginatedResult<StoreProduct> | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<StoreProductType | "all">("all");
  const [sortBy, setSortBy] = useState<SortKey>("featured");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [saleOnly, setSaleOnly] = useState(false);
  const [cartAddingId, setCartAddingId] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [cartError, setCartError] = useState("");

  const totalProducts = productsResponse?.total ?? 0;
  const totalPages = productsResponse?.totalPages ?? 1;
  const products = useMemo(() => productsResponse?.data ?? [], [productsResponse]);

  useEffect(() => {
    let active = true;

    void (async () => {
      setLoading(true);
      setError("");

      try {
        const response = await listProducts({
          page,
          limit: PAGE_SIZE,
          search: search || undefined,
          type: type === "all" ? undefined : type,
          status: "active",
        });

        if (!active) {
          return;
        }

        setProductsResponse(response);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Failed to load store products",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [page, search, type]);

  useEffect(() => {
    setPage(1);
  }, [search, type]);

  const filteredProducts = useMemo(() => {
    const nextProducts = products.filter((product) => {
      if (featuredOnly && !product.isFeatured) {
        return false;
      }

      if (saleOnly && !product.isOnSale) {
        return false;
      }

      return true;
    });

    return [...nextProducts].sort((a, b) => compareProducts(a, b, sortBy));
  }, [featuredOnly, products, saleOnly, sortBy]);

  const featuredProducts = useMemo(() => {
    const ranked = [...filteredProducts].sort((a, b) => compareProducts(a, b, "featured"));
    return ranked.slice(0, 3);
  }, [filteredProducts]);

  const featuredIds = useMemo(
    () => new Set(featuredProducts.map((product) => product._id)),
    [featuredProducts],
  );

  const catalogProducts = useMemo(() => {
    if (!featuredProducts.length) {
      return filteredProducts;
    }

    const remaining = filteredProducts.filter((product) => !featuredIds.has(product._id));
    return remaining.length ? remaining : filteredProducts;
  }, [featuredIds, featuredProducts.length, filteredProducts]);

  const resultLabel = useMemo(() => {
    const count = filteredProducts.length;
    return `${count} curated product${count === 1 ? "" : "s"}`;
  }, [filteredProducts.length]);

  const handleAddToCart = useCallback(
    async (product: StoreProduct) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setCartAddingId(product._id);
      setCartMessage("");
      setCartError("");

      try {
        await addCartItem({ productId: product._id, quantity: 1 });
        setCartMessage(`Added "${product.name}" to cart.`);
      } catch (err) {
        setCartError(err instanceof Error ? err.message : "Unable to add product to cart");
      } finally {
        setCartAddingId("");
      }
    },
    [router, user],
  );

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function handleTypeChange(nextType: StoreProductType | "all") {
    setType(nextType);
    setPage(1);
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setType("all");
    setSortBy("featured");
    setFeaturedOnly(false);
    setSaleOnly(false);
    setPage(1);
  }

  function scrollToCatalog() {
    document.getElementById("store-catalog")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <main className="pb-20 pt-0">
      <MotionSection
        className="relative isolate overflow-hidden bg-gradient-to-br from-cyan-100 via-sky-100 to-amber-100 text-slate-900"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: smoothEase }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl" />
        </div>
        <div className="section-shell relative py-14 lg:px-16 lg:py-20 xl:px-20">
          <Card className="relative overflow-hidden border-white/10 bg-white/80 text-slate-800 shadow-2xl shadow-slate-950/20 backdrop-blur">
            <CardContent className="relative grid gap-8 p-8 md:p-10 lg:grid-cols-[1.15fr_0.85fr]">
            <MotionDiv
              className="space-y-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.04, ease: smoothEase }}
            >
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-white/80 text-cyan-700">Single-seller store</Badge>
                <Badge className="bg-cyan-100 text-cyan-700">Instant delivery</Badge>
                <Badge className="bg-white/80 text-slate-800/90">Coin checkout</Badge>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
                  Digital products and custom services, without marketplace noise.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-700 md:text-base">
                  A compact store experience focused on product quality, fast discovery,
                  and wallet-based conversion. Search what you need, jump into digital
                  delivery, or send a custom request in one step.
                </p>
              </div>

              <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleSearchSubmit}>
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search products, services, or keywords"
                  aria-label="Search store products"
                  className="border-white/10 bg-white/80 text-slate-800 placeholder:text-slate-500 focus-visible:ring-cyan-200"
                />
                <Button type="submit" className="bg-white text-slate-950 hover:bg-slate-100">
                  Search
                </Button>
              </form>

              <div className="flex flex-wrap gap-3">
                <Button
                  className="bg-white text-slate-950 hover:bg-slate-100"
                  onClick={() => {
                    handleTypeChange("digital");
                    scrollToCatalog();
                  }}
                >
                  Digital products
                </Button>
                <Button
                  variant="outline"
                  className="border-white/20 bg-white/5 text-slate-800 hover:bg-cyan-50"
                  onClick={() => {
                    handleTypeChange("custom_order");
                    scrollToCatalog();
                  }}
                >
                  Custom orders
                </Button>
                <Button
                  variant="ghost"
                  className="text-slate-800 hover:bg-cyan-50 hover:text-slate-900"
                  onClick={scrollToCatalog}
                >
                  Browse catalog
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                <Badge className="bg-white/80 text-slate-800">Subscriber discounts</Badge>
                <Badge className="bg-white/80 text-slate-800">Quote support</Badge>
                <Badge className="bg-white/80 text-slate-800">Ticket support</Badge>
              </div>
            </MotionDiv>

            <MotionDiv
              className="grid gap-3 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.08, ease: smoothEase }}
            >
              <div className="rounded-2xl border border-white/10 bg-white/78 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-700">
                  Store snapshot
                </p>
                <p className="mt-2 text-2xl font-semibold">{formatCoins(totalProducts)}</p>
                <p className="mt-1 text-sm text-slate-700">Active products in catalog</p>
              </div>

              {[
                { label: "Digital delivery", value: "Instant after payment" },
                { label: "Custom quote", value: "Short request-to-quote flow" },
                { label: "Payment", value: "Wallet coins only" },
                { label: "Support", value: "Ticket-based assistance" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/74 p-4"
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </MotionDiv>
            </CardContent>
          </Card>
        </div>
      </MotionSection>

      <MotionSection
        className="section-shell mt-6"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.3, ease: smoothEase }}
      >
        <div className="grid gap-3 md:grid-cols-5">
          {[
            "Instant delivery",
            "Custom quote available",
            "Coin payment",
            "Ticket support",
            "Subscriber discount",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm shadow-slate-950/5"
            >
              {item}
            </div>
          ))}
        </div>
      </MotionSection>

      <MotionSection
        id="store-catalog"
        className="section-shell mt-8 space-y-4"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.3, ease: smoothEase }}
      >
        <Card className="border-slate-200/80 bg-white/95 shadow-sm shadow-slate-950/5">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle className="text-2xl">Explore the catalog</CardTitle>
                <CardDescription className="max-w-2xl">
                  Search the store, switch between digital and custom offerings, and sort
                  the current page without adding marketplace noise.
                </CardDescription>
              </div>
              <Badge variant="accent">{resultLabel}</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "All", value: "all" },
                { label: "Digital", value: "digital" },
                { label: "Custom", value: "custom_order" },
              ].map((item) => {
                const active = type === item.value;

                return (
                  <Button
                    key={item.value}
                    type="button"
                    variant={active ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleTypeChange(item.value as StoreProductType | "all")}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr_auto_auto]">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={featuredOnly ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setFeaturedOnly((current) => !current)}
                >
                  Featured only
                </Button>
                <Button
                  type="button"
                  variant={saleOnly ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setSaleOnly((current) => !current)}
                >
                  On sale
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                  Reset
                </Button>
              </div>

              <Select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortKey)}
                aria-label="Sort products"
              >
                <option value="featured">Featured first</option>
                <option value="popular">Best selling</option>
                <option value="rating">Top rated</option>
                <option value="newest">Newest</option>
                <option value="price_asc">Price low to high</option>
                <option value="price_desc">Price high to low</option>
              </Select>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 lg:col-span-2">
                <span>Wallet-ready coin checkout, with quote support for services.</span>
                <span className="font-medium text-slate-950">{formatCoins(totalProducts)} total</span>
              </div>
            </div>
          </CardHeader>
        </Card>
      </MotionSection>

      {cartMessage || cartError ? (
        <MotionSection
          className="section-shell mt-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: smoothEase }}
        >
          <Card className={cartError ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}>
            <CardContent className={cn("p-4 text-sm", cartError ? "text-rose-700" : "text-emerald-700")}>
              {cartError || cartMessage}
            </CardContent>
          </Card>
        </MotionSection>
      ) : null}

      {error ? (
        <MotionSection
          className="section-shell mt-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: smoothEase }}
        >
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
          </Card>
        </MotionSection>
      ) : null}

      {loading ? (
        <div className="section-shell mt-8 flex justify-center py-10">
          <Spinner label="Loading store products" />
        </div>
      ) : null}

      {!loading && featuredProducts.length ? (
        <MotionSection
          className="section-shell mt-8 space-y-4"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.3, ease: smoothEase }}
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Featured and popular
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Curated from the loaded products so the page stays focused on high-conversion
                picks.
              </p>
            </div>
            <Badge variant="accent">Top picks</Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {featuredProducts.map((product) => (
              <StoreProductCard
                key={product._id}
                product={product}
                featured
                className="h-full"
                onAddToCart={handleAddToCart}
                adding={cartAddingId === product._id}
                disableAddToCart={product.type === "digital" && Boolean(product.stock === 0)}
              />
            ))}
          </div>
        </MotionSection>
      ) : null}

      <MotionSection
        className="section-shell mt-8 space-y-4"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 0.32, ease: smoothEase }}
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              All products
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Current page results after search, type filtering, and local sorting.
            </p>
          </div>
          <Badge>{filteredProducts.length} shown</Badge>
        </div>

        {catalogProducts.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {catalogProducts.map((product) => (
              <StoreProductCard
                key={product._id}
                product={product}
                className="h-full"
                onAddToCart={handleAddToCart}
                adding={cartAddingId === product._id}
                disableAddToCart={product.type === "digital" && Boolean(product.stock === 0)}
              />
            ))}
          </div>
        ) : !loading ? (
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-8 text-center">
              <p className="text-lg font-semibold text-slate-950">No products found</p>
              <p className="mt-2 text-sm text-slate-600">
                Try a different keyword, switch product type, or clear the quick filters.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button onClick={resetFilters}>Reset filters</Button>
                <ScrollLink href="#store-support">See support options</ScrollLink>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </MotionSection>

      {totalPages > 1 ? (
        <MotionSection
          className="section-shell mt-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: smoothEase }}
        >
          <Card className="border-slate-200/80 bg-white/95">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </MotionSection>
      ) : null}

      <MotionSection
        id="store-support"
        className="section-shell mt-8"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.16 }}
        transition={{ duration: 0.3, ease: smoothEase }}
      >
        <Card className="overflow-hidden border-slate-200/80 bg-gradient-to-br from-cyan-100 via-sky-100 to-amber-100 text-slate-900 shadow-2xl shadow-slate-950/15">
          <CardContent className="grid gap-6 p-8 md:grid-cols-[1.2fr_0.8fr] md:p-10">
            <div className="space-y-3">
              <Badge className="bg-white/85 text-cyan-700">Support and trust</Badge>
              <h2 className="text-3xl font-semibold tracking-tight">
                Need reassurance before you buy?
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-700">
                Review the FAQ, open a ticket, or check the policy notes before checkout.
                The store is intentionally compact so users can move straight from product
                discovery to payment.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-slate-900">Review highlights</p>
                <p className="mt-1 text-sm text-slate-700">
                  Placeholder area for featured reviews and social proof.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-slate-900">FAQ</p>
                <p className="mt-1 text-sm text-slate-700">
                  Placeholder area for delivery, refund, and support questions.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/tickets/new"
                  className={cn(buttonVariants({ variant: "default" }), "bg-white text-slate-950 hover:bg-slate-100")}
                >
                  Open a ticket
                </a>
                <ScrollLink href="#store-catalog" className="border-white/20 bg-white/5 text-slate-800 hover:bg-cyan-50">
                  Back to products
                </ScrollLink>
              </div>
            </div>
          </CardContent>
        </Card>
      </MotionSection>
    </main>
  );
}

