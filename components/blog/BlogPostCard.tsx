"use client";

import Image from "next/image";
import Link from "next/link";
import type { BlogPostCardV2 } from "@/lib/types";

interface BlogPostCardProps {
  post: BlogPostCardV2;
}

function formatPublishedDate(value?: string) {
  if (!value) {
    return "Recently";
  }

  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Recently";
  }
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  return (
    <article className="group overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
      <Link href={`/blog/${post.slug}`} className="block" aria-label={`Read ${post.title}`}>
        <div className="relative aspect-video overflow-hidden bg-[var(--surface-muted)]">
          {post.coverImageUrl ? (
            <Image
              src={post.coverImageUrl}
              alt={post.title}
              fill
              loading="lazy"
              sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
              className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              No cover image
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {post.flags.isExclusive ? (
              <span className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                VIP Only
              </span>
            ) : null}
            {post.flags.isFeatured ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                Featured
              </span>
            ) : null}
            {post.flags.isPinned ? (
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-800">
                Pinned
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <Link href={`/blog/${post.slug}`} className="block">
          <h2 className="line-clamp-2 text-lg font-semibold leading-7 text-[var(--text-primary)]">
            {post.title}
          </h2>
        </Link>
        <p className="line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">
          {post.excerpt}
        </p>

        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          {post.author.avatarUrl ? (
            <Image
              src={post.author.avatarUrl}
              alt={post.author.fullName}
              width={24}
              height={24}
              className="h-6 w-6 rounded-full border border-[var(--border)] object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)]">
              {post.author.fullName?.slice(0, 1) || "A"}
            </div>
          )}
          <span className="font-medium text-[var(--text-secondary)]">{post.author.fullName}</span>
          <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 font-semibold">
            Lv {post.author.level ?? 1}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
          <span>{post.metrics.readTimeMinutes} min read</span>
          <span>{post.metrics.views} views</span>
          {typeof post.metrics.rewardCoins === "number" ? <span>{post.metrics.rewardCoins} coin reward</span> : null}
          <span>{formatPublishedDate(post.publishedAt)}</span>
        </div>
      </div>
    </article>
  );
}
