"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  createPost,
  listCategories,
  listTags,
  submitPost,
  uploadPostCoverImage,
} from "@/lib/api/blog";
import type { Category, Tag } from "@/lib/types";

export default function NewPostPage() {
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

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

  function toggleTag(id: string) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setResult("");

    try {
      if (coverImage) {
        if (
          !["image/png", "image/jpeg", "image/webp"].includes(coverImage.type)
        ) {
          throw new Error("Cover image must be PNG, JPG/JPEG, or WEBP");
        }

        if (coverImage.size > 8 * 1024 * 1024) {
          throw new Error("Cover image file size must be <= 8MB");
        }
      }

      const created = await createPost({
        title,
        excerpt,
        content,
        categoryId: categoryId || undefined,
        tagIds,
      });

      if (coverImage) {
        const withCover = await uploadPostCoverImage(created._id, coverImage);
        setCoverImageUrl(withCover.coverImageUrl ?? "");
      } else {
        setCoverImageUrl("");
      }

      await submitPost(created._id);
      setResult("Post created and submitted for moderation");
      setTitle("");
      setExcerpt("");
      setContent("");
      setTagIds([]);
      setCategoryId("");
      setCoverImage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create post failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <section className="rounded-2xl border border-black/10 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">Create post draft</h1>
        <p className="mt-2 text-sm text-slate-600">
          Calls POST /posts then POST /posts/:id/submit.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Excerpt</span>
            <input
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Category</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
            >
              <option value="">No category</option>
              {categories.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="mb-2 text-sm text-slate-700">Tags</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((item) => {
                const active = tagIds.includes(item._id);
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => toggleTag(item._id)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      active
                        ? "border-cyan-600 bg-cyan-100 text-cyan-900"
                        : "border-slate-300 text-slate-700"
                    }`}
                  >
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Content</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="h-52 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">
              Cover image (optional)
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) =>
                setCoverImage(event.target.files?.[0] ?? null)
              }
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-700 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-cyan-600"
            />
          </label>

          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt="Uploaded cover"
              className="h-44 w-full rounded-lg border border-slate-200 object-cover"
            />
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {result ? <p className="text-sm text-emerald-700">{result}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {saving ? "Submitting..." : "Create and submit"}
          </button>
        </form>
      </section>
    </main>
  );
}
