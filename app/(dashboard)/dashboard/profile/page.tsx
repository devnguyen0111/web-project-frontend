"use client";

import { FormEvent, useEffect, useState } from "react";
import { getMyProfile, updateMyProfile, uploadMyAvatar } from "@/lib/api/users";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getMyProfile()
      .then((profile) => {
        setFullName(profile.fullName);
        setAvatarUrl(profile.avatarUrl ?? "");
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to fetch profile",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await updateMyProfile({ fullName });
      setMessage("Profile updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const input = form.elements.namedItem("avatar") as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      setError("Please choose an image file");
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Avatar must be PNG, JPG/JPEG, or WEBP");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Avatar file size must be <= 5MB");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const updated = await uploadMyAvatar(file);
      setAvatarUrl(updated.avatarUrl ?? "");
      setMessage("Avatar uploaded successfully");
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Avatar upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-3xl px-4 py-8">Loading...</main>;
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <section className="rounded-2xl border border-black/10 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">My profile</h1>
        <p className="mt-2 text-sm text-slate-600">Calls PATCH /users/me.</p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Full name</span>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-cyan-500"
              required
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? (
            <p className="text-sm text-emerald-700">{message}</p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </form>

        <form
          className="mt-6 space-y-3 border-t border-slate-200 pt-5"
          onSubmit={handleAvatarUpload}
        >
          <p className="text-sm font-medium text-slate-800">
            Avatar (MinIO upload)
          </p>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Current avatar"
              className="h-20 w-20 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <p className="text-xs text-slate-500">No avatar uploaded yet.</p>
          )}

          <input
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-700"
          />

          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60"
          >
            {uploading ? "Uploading avatar..." : "Upload avatar"}
          </button>
        </form>
      </section>
    </main>
  );
}
