import type { Post, PostBlock, PostBlockType, PostImageSize } from "@/lib/types";

export const POST_BLOCK_TYPES: PostBlockType[] = [
  "paragraph",
  "heading",
  "quote",
  "list",
  "image",
  "code",
];

export function getBlockTypeLabel(type: PostBlockType): string {
  switch (type) {
    case "paragraph":
      return "Paragraph";
    case "heading":
      return "Heading";
    case "quote":
      return "Quote";
    case "list":
      return "List";
    case "image":
      return "Image";
    case "code":
      return "Code";
    default:
      return type;
  }
}

export function createEmptyPostBlock(
  type: PostBlockType = "paragraph",
  id = generateBlockId(),
): PostBlock {
  switch (type) {
    case "paragraph":
      return { id, type, text: "" };
    case "heading":
      return { id, type, text: "", level: 2 };
    case "quote":
      return { id, type, text: "" };
    case "list":
      return { id, type, style: "unordered", items: [""] };
    case "image":
      return { id, type, url: "", alt: "", caption: "", size: "medium" };
    case "code":
      return { id, type, code: "", language: "" };
    default:
      return { id, type: "paragraph", text: "" };
  }
}

export function normalizePostBlocksForSubmit(blocks: PostBlock[]): PostBlock[] {
  const normalized: PostBlock[] = [];

  blocks.forEach((block) => {
    const id = block.id || generateBlockId();

    switch (block.type) {
      case "paragraph":
      case "quote": {
        const text = block.text.trim();
        if (text) {
          normalized.push({ id, type: block.type, text });
        }
        return;
      }
      case "heading": {
        const text = block.text.trim();
        if (!text) {
          return;
        }

        normalized.push({
          id,
          type: "heading",
          text,
          level: normalizeHeadingLevel(block.level),
        });
        return;
      }
      case "list": {
        const items = block.items
          .map((item) => item.trim())
          .filter((item) => item.length > 0);

        if (items.length === 0) {
          return;
        }

        normalized.push({
          id,
          type: "list",
          style: block.style === "ordered" ? "ordered" : "unordered",
          items,
        });
        return;
      }
      case "image": {
        const url = block.url.trim();
        if (!url) {
          return;
        }

        const alt = block.alt?.trim();
        const caption = block.caption?.trim();
        const size = normalizeImageSize(block.size);

        normalized.push({
          id,
          type: "image",
          url,
          alt: alt || undefined,
          caption: caption || undefined,
          size,
        });
        return;
      }
      case "code": {
        const code = block.code.trim();
        if (!code) {
          return;
        }

        const language = block.language?.trim();
        normalized.push({
          id,
          type: "code",
          code,
          language: language || undefined,
        });
        return;
      }
      default:
        return;
    }
  });

  return normalized;
}

export function extractTextFromBlocks(blocks: PostBlock[] | undefined): string {
  if (!blocks || blocks.length === 0) {
    return "";
  }

  const tokens = blocks.flatMap((block) => {
    switch (block.type) {
      case "paragraph":
      case "heading":
      case "quote":
        return block.text ? [block.text] : [];
      case "list":
        return block.items;
      case "image":
        return [block.caption, block.alt].filter(
          (value): value is string => Boolean(value),
        );
      case "code":
        return block.code ? [block.code.slice(0, 300)] : [];
      default:
        return [];
    }
  });

  return tokens.join(" ").replace(/\s+/g, " ").trim();
}

export function getPostPreviewText(
  post: Pick<Post, "excerpt" | "blocks">,
  maxLength = 180,
): string {
  const text = (post.excerpt?.trim() || extractTextFromBlocks(post.blocks)).trim();

  if (!text) {
    return "No preview available.";
  }

  return truncateText(text, maxLength);
}

function normalizeHeadingLevel(level: number | undefined): 1 | 2 | 3 | 4 {
  if (level === 1 || level === 2 || level === 3 || level === 4) {
    return level;
  }

  return 2;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(maxLength - 3, 1)).trimEnd()}...`;
}

function normalizeImageSize(size: PostImageSize | undefined): PostImageSize {
  if (size === "small" || size === "medium" || size === "large") {
    return size;
  }

  return "medium";
}

function generateBlockId(): string {
  return `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
