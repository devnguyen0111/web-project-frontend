"use client";

import Image from "next/image";
import type { PostBlock } from "@/lib/types";

interface PostBlockRendererProps {
  blocks: PostBlock[];
}

function normalizeOptionalString(value?: string) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function slugifyHeading(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return normalized || undefined;
}

function ensureUniqueHeadingId(baseId: string, usedIds: Set<string>) {
  if (!usedIds.has(baseId)) {
    usedIds.add(baseId);
    return baseId;
  }

  let suffix = 2;
  while (usedIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }

  const uniqueId = `${baseId}-${suffix}`;
  usedIds.add(uniqueId);
  return uniqueId;
}

function getEmbedUrl(provider: "youtube" | "twitter", url: string) {
  if (provider === "twitter") {
    return `https://platform.twitter.com/embed/Tweet.html?url=${encodeURIComponent(url)}`;
  }

  const trimmed = url.trim();
  const youtubeId =
    trimmed.match(/[?&]v=([^&]+)/)?.[1] ||
    trimmed.match(/youtu\.be\/([^?&/]+)/)?.[1] ||
    trimmed.match(/youtube\.com\/embed\/([^?&/]+)/)?.[1];

  if (!youtubeId) {
    return "";
  }

  return `https://www.youtube.com/embed/${youtubeId}`;
}

export function PostBlockRenderer({ blocks }: PostBlockRendererProps) {
  const imageContainerClassBySize = {
    small: "max-w-xl",
    medium: "max-w-3xl",
    large: "max-w-5xl",
  } as const;

  const imageHeightClassBySize = {
    small: "max-h-[42vh]",
    medium: "max-h-[60vh]",
    large: "max-h-[70vh]",
  } as const;

  const headingIdsByIndex = new Map<number, string>();
  const usedHeadingIds = new Set<string>();

  blocks.forEach((block, index) => {
    if (block.type !== "heading") {
      return;
    }

    const baseId =
      normalizeOptionalString(block.id) ??
      slugifyHeading(block.text) ??
      `heading-${index + 1}`;
    const headingId = ensureUniqueHeadingId(baseId, usedHeadingIds);
    headingIdsByIndex.set(index, headingId);
  });

  if (!blocks.length) {
    return (
      <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-muted)]">
        This post has no renderable blocks yet.
      </p>
    );
  }

  return (
    <div className="prose prose-slate max-w-none space-y-6">
      {blocks.map((block, index) => {
        const key = block.id || `${block.type}-${index}`;

        switch (block.type) {
          case "paragraph":
            return (
              <p
                key={key}
                className="m-0 whitespace-pre-wrap text-base leading-8 text-[var(--text-secondary)]"
              >
                {block.text}
              </p>
            );
          case "heading": {
            const headingTagByLevel = {
              1: "h1",
              2: "h2",
              3: "h3",
              4: "h4",
            } as const;
            const HeadingTag = headingTagByLevel[block.level];
            const headingId = headingIdsByIndex.get(index) ?? `heading-${index + 1}`;

            return (
              <HeadingTag
                key={key}
                id={headingId}
                className={`scroll-mt-28 font-semibold text-[var(--text-primary)] ${
                  block.level === 1
                    ? "text-4xl"
                    : block.level === 2
                      ? "text-3xl"
                      : block.level === 3
                        ? "text-2xl"
                        : "text-xl"
                }`}
              >
                {block.text}
              </HeadingTag>
            );
          }
          case "quote":
            return (
              <blockquote
                key={key}
                className="m-0 rounded-[var(--radius-lg)] border-l-4 border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-5 py-4 text-base italic leading-8 text-[var(--text-secondary)]"
              >
                {block.text}
              </blockquote>
            );
          case "list": {
            const ListTag = block.style === "ordered" ? "ol" : "ul";

            return (
              <ListTag
                key={key}
                className={`m-0 space-y-2 pl-6 text-base leading-8 text-[var(--text-secondary)] ${
                  block.style === "ordered" ? "list-decimal" : "list-disc"
                }`}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}-item-${itemIndex}`}>{item}</li>
                ))}
              </ListTag>
            );
          }
          case "image": {
            const size = block.size || "medium";
            const containerClass = imageContainerClassBySize[size];
            const heightClass = imageHeightClassBySize[size];
            return (
              <figure key={key} className={`mx-auto my-0 w-full ${containerClass} space-y-2`}>
                <Image
                  src={block.url}
                  alt={block.alt || block.caption || "Post image"}
                  width={1600}
                  height={1000}
                  className={`mx-auto h-auto w-auto max-w-full ${heightClass} rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] object-contain`}
                  unoptimized
                />
                {block.caption ? (
                  <figcaption className="text-center text-sm text-[var(--text-muted)]">
                    {block.caption}
                  </figcaption>
                ) : null}
              </figure>
            );
          }
          case "code":
            return (
              <section key={key} className="space-y-2">
                {block.language ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    {block.language}
                  </p>
                ) : null}
                <pre className="m-0 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-slate-950 p-4 text-sm leading-6 text-slate-100">
                  <code>{block.code}</code>
                </pre>
              </section>
            );
          case "divider":
            return <hr key={key} className="my-8 border-t border-[var(--border)]" />;
          case "embed": {
            const embedUrl = getEmbedUrl(block.provider, block.embedUrl);
            if (!embedUrl) {
              return (
                <p key={key} className="text-sm text-[var(--text-muted)]">
                  Unsupported embed URL.
                </p>
              );
            }

            return (
              <div
                key={key}
                className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]"
              >
                <iframe
                  title={`${block.provider}-embed-${index + 1}`}
                  src={embedUrl}
                  className="h-[420px] w-full"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            );
          }
          case "callout": {
            const toneClassByTone = {
              info: "border-sky-300 bg-sky-50 text-sky-900",
              success: "border-emerald-300 bg-emerald-50 text-emerald-900",
              warning: "border-amber-300 bg-amber-50 text-amber-900",
              danger: "border-rose-300 bg-rose-50 text-rose-900",
            } as const;
            const toneClass = toneClassByTone[block.tone || "info"];

            return (
              <aside
                key={key}
                className={`rounded-[var(--radius-lg)] border p-4 text-base leading-7 ${toneClass}`}
              >
                {block.text}
              </aside>
            );
          }
          case "todo":
            return (
              <ul key={key} className="space-y-2">
                {block.todoItems.map((item, itemIndex) => (
                  <li
                    key={`${key}-todo-${itemIndex}`}
                    className="flex items-center gap-2 text-base text-[var(--text-secondary)]"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked === true}
                      readOnly
                      aria-label={`todo-${itemIndex + 1}`}
                      className="h-4 w-4 rounded border-[var(--border)]"
                    />
                    <span className={item.checked ? "line-through text-[var(--text-muted)]" : ""}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
