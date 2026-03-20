"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PostBlockEditor } from "@/components/blog/PostBlockEditor";
import { PostBlockRenderer } from "@/components/blog/PostBlockRenderer";
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
  Label,
  Select,
  Spinner,
} from "@/components/ui";
import {
  getMyPostDetail,
  listCategories,
  listTags,
  updatePost,
  uploadPostBlockImage,
  uploadPostCoverImage,
} from "@/lib/api/blog";
import { createEmptyPostBlock, normalizePostBlocksForSubmit } from "@/lib/post-blocks";
import type { Category, PostBlock, Tag } from "@/lib/types";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_COVER_SIZE = 8 * 1024 * 1024;
const MAX_POLL_OPTIONS = 6;
const MIN_POLL_OPTIONS = 2;
const smoothEase = [0.22, 1, 0.36, 1] as const;
type PollMode = "none" | "permanent" | "scheduled";

function toLocalDatetimeInputValue(value?: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localTimestamp = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localTimestamp.toISOString().slice(0, 16);
}

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const postId = useMemo(() => params?.id ?? "", [params]);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [blocks, setBlocks] = useState<PostBlock[]>(() => [createEmptyPostBlock("paragraph")]);
  const [categoryId, setCategoryId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreviewUrl, setCoverImagePreviewUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverInputKey, setCoverInputKey] = useState(0);
  const [pollMode, setPollMode] = useState<PollMode>("none");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollEndsAt, setPollEndsAt] = useState("");
  const [currentStatus, setCurrentStatus] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const previewBlocks = useMemo(() => normalizePostBlocksForSubmit(blocks), [blocks]);

  useEffect(() => {
    Promise.all([listCategories(), listTags()])
      .then(([categoryData, tagData]) => {
        setCategories(categoryData);
        setTags(tagData);
      })
      .catch(() => {
        setCategories([]);
        setTags([]);
      });
  }, []);

  useEffect(() => {
    if (!coverImage) {
      setCoverImagePreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(coverImage);
    setCoverImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [coverImage]);

  useEffect(() => {
    if (!postId) {
      setLoading(false);
      setError("Post id is missing");
      return;
    }

    setLoading(true);
    setError("");

    getMyPostDetail(postId)
      .then((post) => {
        setTitle(post.title ?? "");
        setExcerpt(post.excerpt ?? "");
        setBlocks(post.blocks && post.blocks.length > 0 ? post.blocks : [createEmptyPostBlock("paragraph")]);
        setCategoryId(post.categoryId ?? "");
        setTagIds(post.tags ?? []);
        setCoverImageUrl(post.coverImageUrl ?? "");
        setCurrentStatus(post.status);

        if (post.poll) {
          const isPermanent = post.poll.isPermanent ?? !post.poll.endsAt;
          setPollMode(isPermanent ? "permanent" : "scheduled");
          setPollQuestion(post.poll.question ?? "");
          setPollOptions(
            post.poll.options && post.poll.options.length >= MIN_POLL_OPTIONS
              ? post.poll.options.map((option) => option.text ?? "")
              : ["", ""],
          );
          setPollEndsAt(isPermanent ? "" : toLocalDatetimeInputValue(post.poll.endsAt));
        } else {
          setPollMode("none");
          setPollQuestion("");
          setPollOptions(["", ""]);
          setPollEndsAt("");
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load post detail");
      })
      .finally(() => setLoading(false));
  }, [postId]);

  function toggleTag(id: string) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function handleCoverImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError("");

    if (!file) {
      setCoverImage(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Cover image must be PNG, JPG/JPEG, or WEBP");
      setCoverImage(null);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_COVER_SIZE) {
      setError("Cover image file size must be up to 8MB");
      setCoverImage(null);
      event.target.value = "";
      return;
    }

    setCoverImage(file);
  }

  function clearCoverSelection() {
    setCoverImage(null);
    setCoverInputKey((current) => current + 1);
  }

  async function handleUploadBlockImage(file: File): Promise<string> {
    const uploadResult = await uploadPostBlockImage(file);
    return uploadResult.url;
  }

  function updatePollOption(index: number, value: string) {
    setPollOptions((prev) =>
      prev.map((item, currentIndex) => (currentIndex === index ? value : item)),
    );
  }

  function addPollOption() {
    setPollOptions((prev) =>
      prev.length >= MAX_POLL_OPTIONS ? prev : [...prev, ""],
    );
  }

  function removePollOption(index: number) {
    setPollOptions((prev) => {
      if (prev.length <= MIN_POLL_OPTIONS) {
        return prev;
      }

      return prev.filter((_, currentIndex) => currentIndex !== index);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!postId) {
      return;
    }

    setSaving(true);
    setError("");
    setResult("");

    try {
      if (coverImage) {
        if (!ALLOWED_IMAGE_TYPES.includes(coverImage.type)) {
          throw new Error("Cover image must be PNG, JPG/JPEG, or WEBP");
        }

        if (coverImage.size > MAX_COVER_SIZE) {
          throw new Error("Cover image file size must be up to 8MB");
        }
      }

      const normalizedBlocks = normalizePostBlocksForSubmit(blocks);
      if (normalizedBlocks.length === 0) {
        throw new Error("Post must contain at least one non-empty block");
      }

      let pollPayload:
        | {
            question: string;
            options: Array<{ text: string }>;
            isPermanent: boolean;
            endsAt?: string;
          }
        | undefined;

      if (pollMode !== "none") {
        const normalizedQuestion = pollQuestion.trim();
        if (!normalizedQuestion) {
          throw new Error("Poll question is required");
        }

        const normalizedOptions = pollOptions
          .map((option) => option.trim())
          .filter((option) => option.length > 0);

        if (normalizedOptions.length < MIN_POLL_OPTIONS) {
          throw new Error("Poll requires at least 2 non-empty options");
        }

        if (normalizedOptions.length > MAX_POLL_OPTIONS) {
          throw new Error("Poll can have at most 6 options");
        }

        if (pollMode === "scheduled") {
          if (!pollEndsAt) {
            throw new Error("Poll end time is required for scheduled poll");
          }

          const endsAtDate = new Date(pollEndsAt);
          if (Number.isNaN(endsAtDate.getTime())) {
            throw new Error("Poll end time is invalid");
          }

          if (endsAtDate.getTime() <= Date.now()) {
            throw new Error("Poll end time must be in the future");
          }

          pollPayload = {
            question: normalizedQuestion,
            options: normalizedOptions.map((text) => ({ text })),
            isPermanent: false,
            endsAt: endsAtDate.toISOString(),
          };
        } else {
          pollPayload = {
            question: normalizedQuestion,
            options: normalizedOptions.map((text) => ({ text })),
            isPermanent: true,
          };
        }
      }

      const updated = await updatePost(postId, {
        title,
        excerpt,
        blocks: normalizedBlocks,
        categoryId: categoryId || undefined,
        tagIds,
        poll: pollPayload,
      });

      if (coverImage) {
        const withCover = await uploadPostCoverImage(postId, coverImage);
        setCoverImageUrl(withCover.coverImageUrl ?? coverImageUrl);
      }

      setCurrentStatus(updated.status);
      setResult(
        updated.status === "pending"
          ? "Post updated and moved to moderation queue"
          : "Post updated successfully",
      );
      setCoverImage(null);
      setCoverInputKey((current) => current + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update post failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="section-shell flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
        <Spinner label="Loading post detail" />
      </main>
    );
  }

  return (
    <main className="pb-14 pt-10">
      <MotionSection
        className="section-shell space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: smoothEase }}
      >
        <MotionDiv
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: smoothEase }}
        >
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            Back to dashboard
          </Link>
          {currentStatus ? <Badge>{currentStatus}</Badge> : null}
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04, ease: smoothEase }}
        >
          <Card>
            <CardHeader>
              <Badge className="w-fit">Author studio</Badge>
              <CardTitle>Edit post</CardTitle>
              <CardDescription>
                Author edits will move non-draft posts back to moderation queue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Input id="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    id="category"
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                  >
                    <option value="">No category</option>
                    {categories.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((item) => {
                      const active = tagIds.includes(item._id);
                      return (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => toggleTag(item._id)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                            active
                              ? "border-cyan-300 bg-cyan-100 text-cyan-800"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Content blocks</Label>
                <PostBlockEditor
                  blocks={blocks}
                  onChange={setBlocks}
                  onUploadImage={handleUploadBlockImage}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  {previewBlocks.length > 0 ? (
                    <PostBlockRenderer blocks={previewBlocks} />
                  ) : (
                    <p className="text-sm text-slate-500">Add text to at least one block to see preview.</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pollMode">Poll mode</Label>
                  <Select
                    id="pollMode"
                    value={pollMode}
                    onChange={(event) => setPollMode(event.target.value as PollMode)}
                    disabled={saving}
                  >
                    <option value="none">No poll</option>
                    <option value="permanent">Permanent poll</option>
                    <option value="scheduled">Poll with end time</option>
                  </Select>
                </div>

                {pollMode !== "none" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="pollQuestion">Poll question</Label>
                      <Input
                        id="pollQuestion"
                        value={pollQuestion}
                        onChange={(event) => setPollQuestion(event.target.value)}
                        placeholder="Ask your audience..."
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Poll options</Label>
                      {pollOptions.map((option, index) => (
                        <div key={`poll-option-${index}`} className="flex items-center gap-2">
                          <Input
                            value={option}
                            onChange={(event) => updatePollOption(index, event.target.value)}
                            placeholder={`Option ${index + 1}`}
                            disabled={saving}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removePollOption(index)}
                            disabled={saving || pollOptions.length <= MIN_POLL_OPTIONS}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPollOption}
                        disabled={saving || pollOptions.length >= MAX_POLL_OPTIONS}
                      >
                        Add option
                      </Button>
                    </div>

                    {pollMode === "scheduled" ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="pollEndsAt">Poll ends at</Label>
                        <Input
                          id="pollEndsAt"
                          type="datetime-local"
                          value={pollEndsAt}
                          onChange={(event) => setPollEndsAt(event.target.value)}
                          disabled={saving}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        This poll will remain open permanently.
                      </p>
                    )}
                  </>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coverImage">Cover image (optional)</Label>
                <Input
                  key={coverInputKey}
                  id="coverImage"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleCoverImageChange}
                />
                {coverImagePreviewUrl ? (
                  <div className="relative h-52 w-full overflow-hidden rounded-xl border border-slate-200">
                    <Image
                      src={coverImagePreviewUrl}
                      alt="Cover preview"
                      fill
                      sizes="(max-width: 1024px) 100vw, 700px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : null}
                {coverImageUrl ? (
                  <div className="relative h-52 w-full overflow-hidden rounded-xl border border-slate-200">
                    <Image
                      src={coverImageUrl}
                      alt="Current cover"
                      fill
                      sizes="(max-width: 1024px) 100vw, 700px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearCoverSelection}
                  disabled={!coverImage || saving}
                >
                  Clear selected cover
                </Button>
              </div>

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              {result ? <p className="text-sm text-emerald-700">{result}</p> : null}

              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
              </form>
            </CardContent>
          </Card>
        </MotionDiv>
      </MotionSection>
    </main>
  );
}

