"use client";

import Image from "next/image";
import type { PostBlock } from "@/lib/types";

interface PostBlockRendererProps {
  blocks: PostBlock[];
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

  if (!blocks.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
        This post has no renderable blocks yet.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        const key = block.id || `${block.type}-${index}`;

        switch (block.type) {
          case "paragraph":
            return (
              <p key={key} className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
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

            return (
              <HeadingTag
                key={key}
                className={`font-semibold text-slate-900 ${
                  block.level === 1
                    ? "text-3xl"
                    : block.level === 2
                      ? "text-2xl"
                      : block.level === 3
                        ? "text-xl"
                        : "text-lg"
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
                className="border-l-4 border-cyan-400 bg-cyan-50/60 px-4 py-3 text-sm italic leading-7 text-slate-700"
              >
                {block.text}
              </blockquote>
            );
          case "list": {
            const ListTag = block.style === "ordered" ? "ol" : "ul";

            return (
              <ListTag
                key={key}
                className={`space-y-1 pl-6 text-sm leading-7 text-slate-700 ${
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
              <figure key={key} className={`mx-auto w-full ${containerClass} space-y-2`}>
                <Image
                  src={block.url}
                  alt={block.alt || block.caption || "Post image"}
                  width={1600}
                  height={1000}
                  className={`mx-auto h-auto w-auto max-w-full ${heightClass} rounded-xl border border-slate-200 bg-slate-50 object-contain`}
                  unoptimized
                />
                {block.caption ? (
                  <figcaption className="text-center text-xs text-slate-500">{block.caption}</figcaption>
                ) : null}
              </figure>
            );
          }
          case "code":
            return (
              <section key={key} className="space-y-2">
                {block.language ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {block.language}
                  </p>
                ) : null}
                <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                  <code>{block.code}</code>
                </pre>
              </section>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
