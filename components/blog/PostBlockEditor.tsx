"use client";

import Image from "next/image";
import { ChangeEvent, useState } from "react";
import {
  createEmptyPostBlock,
  getBlockTypeLabel,
  POST_BLOCK_TYPES,
} from "@/lib/post-blocks";
import type { PostBlock, PostBlockType, PostImageSize } from "@/lib/types";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from "@/components/ui";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

interface PostBlockEditorProps {
  blocks: PostBlock[];
  onChange: (blocks: PostBlock[]) => void;
  onUploadImage: (file: File) => Promise<string>;
  disabled?: boolean;
}

export function PostBlockEditor({
  blocks,
  onChange,
  onUploadImage,
  disabled = false,
}: PostBlockEditorProps) {
  const [uploadingByBlockKey, setUploadingByBlockKey] = useState<Record<string, boolean>>({});
  const [uploadErrorByBlockKey, setUploadErrorByBlockKey] = useState<Record<string, string>>({});

  function getBlockKey(index: number, block: PostBlock): string {
    return block.id || `${block.type}-${index}`;
  }

  function setUploading(blockKey: string, value: boolean) {
    setUploadingByBlockKey((prev) => ({ ...prev, [blockKey]: value }));
  }

  function setUploadError(blockKey: string, message = "") {
    setUploadErrorByBlockKey((prev) => ({ ...prev, [blockKey]: message }));
  }

  function updateBlock(index: number, nextBlock: PostBlock) {
    onChange(blocks.map((block, currentIndex) => (currentIndex === index ? nextBlock : block)));
  }

  function changeBlockType(index: number, nextType: PostBlockType) {
    const currentId = blocks[index]?.id;
    updateBlock(index, createEmptyPostBlock(nextType, currentId));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= blocks.length) {
      return;
    }

    const nextBlocks = [...blocks];
    const [currentBlock] = nextBlocks.splice(index, 1);
    nextBlocks.splice(nextIndex, 0, currentBlock);
    onChange(nextBlocks);
  }

  function removeBlock(index: number) {
    if (blocks.length <= 1) {
      return;
    }

    onChange(blocks.filter((_, currentIndex) => currentIndex !== index));
  }

  function addBlock(type: PostBlockType) {
    onChange([...blocks, createEmptyPostBlock(type)]);
  }

  async function handleImageFileChange(
    index: number,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const block = blocks[index];
    if (!block || block.type !== "image") {
      return;
    }

    const blockKey = getBlockKey(index, block);
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploadError(blockKey);

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setUploadError(blockKey, "Image must be PNG, JPG/JPEG, or WEBP");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setUploadError(blockKey, "Image size must be up to 8MB");
      return;
    }

    setUploading(blockKey, true);

    try {
      const uploadedUrl = await onUploadImage(file);
      updateBlock(index, { ...block, url: uploadedUrl });
    } catch (error) {
      setUploadError(
        blockKey,
        error instanceof Error ? error.message : "Upload failed",
      );
    } finally {
      setUploading(blockKey, false);
    }
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <Card key={block.id || `block-${index}`} className="border border-slate-200 shadow-none">
          <CardHeader className="space-y-3 border-b border-slate-100 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">Block #{index + 1}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => moveBlock(index, -1)}
                  disabled={index === 0 || disabled}
                >
                  Up
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => moveBlock(index, 1)}
                  disabled={index === blocks.length - 1 || disabled}
                >
                  Down
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="destructive"
                  onClick={() => removeBlock(index)}
                  disabled={blocks.length <= 1 || disabled}
                >
                  Remove
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor={`block-type-${index}`}>Block type</Label>
                <Select
                  id={`block-type-${index}`}
                  value={block.type}
                  onChange={(event) => changeBlockType(index, event.target.value as PostBlockType)}
                  disabled={disabled}
                >
                {POST_BLOCK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {getBlockTypeLabel(type)}
                  </option>
                ))}
              </Select>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-4">
            {(block.type === "paragraph" || block.type === "quote") ? (
              <div className="space-y-1.5">
                <Label htmlFor={`block-text-${index}`}>Text</Label>
                <Textarea
                  id={`block-text-${index}`}
                  value={block.text}
                  onChange={(event) => updateBlock(index, { ...block, text: event.target.value })}
                  className="min-h-[130px]"
                  placeholder={block.type === "quote" ? "Enter quote..." : "Write paragraph..."}
                  disabled={disabled}
                />
              </div>
            ) : null}

            {block.type === "heading" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor={`block-heading-level-${index}`}>Heading level</Label>
                  <Select
                    id={`block-heading-level-${index}`}
                    value={String(block.level)}
                    onChange={(event) =>
                      updateBlock(index, {
                        ...block,
                        level: Number(event.target.value) as 1 | 2 | 3 | 4,
                      })
                    }
                    disabled={disabled}
                  >
                    <option value="1">H1</option>
                    <option value="2">H2</option>
                    <option value="3">H3</option>
                    <option value="4">H4</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`block-heading-text-${index}`}>Heading text</Label>
                  <Input
                    id={`block-heading-text-${index}`}
                    value={block.text}
                    onChange={(event) => updateBlock(index, { ...block, text: event.target.value })}
                    placeholder="Enter heading..."
                    disabled={disabled}
                  />
                </div>
              </>
            ) : null}

            {block.type === "list" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor={`block-list-style-${index}`}>List style</Label>
                  <Select
                    id={`block-list-style-${index}`}
                    value={block.style}
                    onChange={(event) =>
                      updateBlock(index, {
                        ...block,
                        style: event.target.value === "ordered" ? "ordered" : "unordered",
                      })
                    }
                    disabled={disabled}
                  >
                    <option value="unordered">Unordered</option>
                    <option value="ordered">Ordered</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`block-list-items-${index}`}>Items (one per line)</Label>
                  <Textarea
                    id={`block-list-items-${index}`}
                    value={block.items.join("\n")}
                    onChange={(event) =>
                      updateBlock(index, {
                        ...block,
                        items: event.target.value.split(/\r?\n/),
                      })
                    }
                    className="min-h-[130px]"
                    disabled={disabled}
                  />
                </div>
              </>
            ) : null}

            {block.type === "image" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor={`block-image-url-${index}`}>Image URL</Label>
                  <Input
                    id={`block-image-url-${index}`}
                    value={block.url}
                    onChange={(event) => updateBlock(index, { ...block, url: event.target.value })}
                    placeholder="https://..."
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`block-image-file-${index}`}>Upload image to MinIO</Label>
                  <Input
                    id={`block-image-file-${index}`}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => void handleImageFileChange(index, event)}
                    disabled={disabled || uploadingByBlockKey[getBlockKey(index, block)]}
                  />
                  <p className="text-xs text-slate-500">
                    PNG/JPG/WEBP up to 8MB. Uploaded URL will auto-fill to image URL field.
                  </p>
                </div>

                {uploadErrorByBlockKey[getBlockKey(index, block)] ? (
                  <p className="text-xs text-rose-600">{uploadErrorByBlockKey[getBlockKey(index, block)]}</p>
                ) : null}

                {uploadingByBlockKey[getBlockKey(index, block)] ? (
                  <p className="text-xs text-cyan-700">Uploading image...</p>
                ) : null}

                {block.url ? (
                  <div className="relative h-48 w-full overflow-hidden rounded-xl border border-slate-200">
                    <Image
                      src={block.url}
                      alt={block.alt || block.caption || "Uploaded image"}
                      fill
                      sizes="(max-width: 1024px) 100vw, 700px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <Label htmlFor={`block-image-alt-${index}`}>Alt text</Label>
                  <Input
                    id={`block-image-alt-${index}`}
                    value={block.alt || ""}
                    onChange={(event) => updateBlock(index, { ...block, alt: event.target.value })}
                    placeholder="Describe image for accessibility"
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`block-image-size-${index}`}>Image size</Label>
                  <Select
                    id={`block-image-size-${index}`}
                    value={block.size || "medium"}
                    onChange={(event) =>
                      updateBlock(index, {
                        ...block,
                        size: event.target.value as PostImageSize,
                      })
                    }
                    disabled={disabled}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`block-image-caption-${index}`}>Caption</Label>
                  <Input
                    id={`block-image-caption-${index}`}
                    value={block.caption || ""}
                    onChange={(event) => updateBlock(index, { ...block, caption: event.target.value })}
                    placeholder="Optional caption"
                    disabled={disabled}
                  />
                </div>
              </>
            ) : null}

            {block.type === "code" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor={`block-code-language-${index}`}>Language</Label>
                  <Input
                    id={`block-code-language-${index}`}
                    value={block.language || ""}
                    onChange={(event) => updateBlock(index, { ...block, language: event.target.value })}
                    placeholder="ts, js, sql..."
                    disabled={disabled}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`block-code-content-${index}`}>Code</Label>
                  <Textarea
                    id={`block-code-content-${index}`}
                    value={block.code}
                    onChange={(event) => updateBlock(index, { ...block, code: event.target.value })}
                    className="min-h-[180px] font-mono text-xs"
                    placeholder="Paste code block..."
                    disabled={disabled}
                  />
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      ))}

      <div className="rounded-xl border border-dashed border-slate-300 p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Add new block</p>
        <div className="flex flex-wrap gap-2">
          {POST_BLOCK_TYPES.map((type) => (
            <Button
              key={type}
              type="button"
              size="xs"
              variant="outline"
              onClick={() => addBlock(type)}
              disabled={disabled}
            >
              + {getBlockTypeLabel(type)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
