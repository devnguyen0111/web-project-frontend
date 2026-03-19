"use client";

import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { StoreProduct } from "@/lib/types";

interface StoreProductCardProps {
  product: StoreProduct;
  featured?: boolean;
  className?: string;
  onAddToCart?: (product: StoreProduct) => void;
  adding?: boolean;
  disableAddToCart?: boolean;
}

function formatCoins(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function getProductImage(product: StoreProduct) {
  return product.images?.[0]?.url ?? product.previewUrl ?? "";
}

function getProductLabel(product: StoreProduct) {
  if (product.type === "digital") {
    return "Digital";
  }

  return "Custom";
}

function getDeliveryLabel(product: StoreProduct) {
  if (product.type === "digital") {
    return "Instant delivery";
  }

  if (product.estimatedDays) {
    return `${product.estimatedDays.min}-${product.estimatedDays.max} days`;
  }

  return "Quote available";
}

function getPriceSummary(product: StoreProduct) {
  const saleActive =
    Boolean(product.isOnSale) &&
    typeof product.originalPrice === "number" &&
    product.originalPrice > product.price;

  return {
    saleActive,
    current: product.price,
    original: saleActive ? product.originalPrice : undefined,
  };
}

function getDiscountBadges(product: StoreProduct) {
  const badges: string[] = [];

  if (product.isFeatured) {
    badges.push("Featured");
  }

  if (product.isOnSale) {
    badges.push("On sale");
  }

  if (product.subscriberDiscount) {
    const { pro, vip } = product.subscriberDiscount;

    if (typeof pro === "number" && pro > 0) {
      badges.push(`Pro -${pro}%`);
    }

    if (typeof vip === "number" && vip > 0) {
      badges.push(`VIP -${vip}%`);
    }
  }

  return badges;
}

function getMetaValue(value?: number) {
  if (typeof value !== "number") {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);
}

export function StoreProductCard({
  product,
  featured = false,
  className,
  onAddToCart,
  adding = false,
  disableAddToCart = false,
}: StoreProductCardProps) {
  const image = getProductImage(product);
  const price = getPriceSummary(product);
  const badges = getDiscountBadges(product);

  return (
    <Card
      className={cn(
        "group h-full overflow-hidden border-slate-200/80 bg-white/90 shadow-sm shadow-slate-950/5 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/10",
        featured && "border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-white",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {image ? (
          <Image
            src={image}
            alt={product.images?.[0]?.alt ?? product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-100 via-sky-100 to-amber-100 text-slate-900">
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Single-seller store
              </p>
              <p className="mt-2 text-lg font-semibold">{product.name}</p>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white/95 text-slate-900 shadow-sm">
              {getProductLabel(product)}
            </Badge>
            {featured ? <Badge variant="accent">Featured</Badge> : null}
            {price.saleActive ? <Badge variant="accent">Sale</Badge> : null}
          </div>
          <Badge className="bg-white text-cyan-800 shadow-sm border border-cyan-200/70">
            {getDeliveryLabel(product)}
          </Badge>
        </div>
      </div>

      <CardHeader className="space-y-3">
        <div className="space-y-1.5">
          <CardTitle className="line-clamp-1 text-xl">{product.name}</CardTitle>
          <CardDescription className="line-clamp-2 min-h-[2.75rem]">
            {product.shortDescription ?? product.description ?? "Premium store product."}
          </CardDescription>
        </div>

        <div className="flex flex-wrap gap-2">
          {(product.tags ?? []).slice(0, 3).map((tag) => (
            <Badge key={tag} variant="default" className="bg-slate-100 text-slate-700">
              {tag}
            </Badge>
          ))}
          {badges.slice(0, 2).map((label) => (
            <Badge key={label} variant="accent">
              {label}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-950">
              {getMetaValue(product.rating)}
            </div>
            Rating
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-950">
              {getMetaValue(product.salesCount)}
            </div>
            Sales
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-950">
              {getMetaValue(product.reviewsCount)}
            </div>
            Reviews
          </div>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {product.type === "digital" ? "Price" : "Starting from"}
            </p>
            <p className="text-2xl font-semibold tracking-tight text-slate-950">
              {formatCoins(price.current)} coin
            </p>
          </div>

          {price.original ? (
            <p className="text-sm text-slate-500 line-through">
              {formatCoins(price.original)} coin
            </p>
          ) : (
            <p className="text-xs font-medium text-slate-500">{getDeliveryLabel(product)}</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs leading-5 text-slate-500">
            {product.type === "digital"
              ? "Instant checkout with wallet coins."
              : "Request a quote and keep the purchase flow short."}
          </p>
          <div className="flex flex-wrap gap-2">
            {onAddToCart ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddToCart(product)}
                disabled={adding || disableAddToCart}
              >
                {adding ? "Adding..." : "Add to cart"}
              </Button>
            ) : null}
            <Link
              href={`/store/${product.slug}`}
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "shrink-0")}
            >
              View details
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
