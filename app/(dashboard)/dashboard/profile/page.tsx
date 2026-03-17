"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Spinner } from "@/components/ui";
import { getMyProfile, updateMyProfile, uploadMyAvatar } from "@/lib/api/users";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [avatarInputKey, setAvatarInputKey] = useState(0);
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
        setError(err instanceof Error ? err.message : "Failed to fetch profile");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedAvatar) {
      setAvatarPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedAvatar);
    setAvatarPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedAvatar]);

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

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError("");
    setMessage("");

    if (!file) {
      setSelectedAvatar(null);
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Avatar must be PNG, JPG/JPEG, or WEBP");
      setSelectedAvatar(null);
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setError("Avatar file size must be up to 5MB");
      setSelectedAvatar(null);
      event.target.value = "";
      return;
    }

    setSelectedAvatar(file);
  }

  function clearAvatarSelection() {
    setSelectedAvatar(null);
    setAvatarInputKey((current) => current + 1);
  }

  async function handleAvatarUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAvatar) {
      setError("Please choose an image file");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const updated = await uploadMyAvatar(selectedAvatar);
      setAvatarUrl(updated.avatarUrl ?? "");
      setMessage("Avatar uploaded successfully");
      clearAvatarSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Avatar upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <main className="section-shell flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
        <Spinner label="Loading profile" />
      </main>
    );
  }

  return (
    <main className="pb-14 pt-10">
      <section className="section-shell grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile information</CardTitle>
            <CardDescription>Update full name from /users/me</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </div>

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avatar upload</CardTitle>
            <CardDescription>Select image, preview it, then confirm upload to /users/me/avatar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" fill sizes="80px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                    No avatar
                  </div>
                )}
              </div>
              <div className="relative h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                {avatarPreviewUrl ? (
                  <Image
                    src={avatarPreviewUrl}
                    alt="Avatar preview"
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                    Preview
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-600">PNG/JPG/WEBP, max 5MB</p>
            </div>

            <form className="space-y-3" onSubmit={handleAvatarUpload}>
              <Input
                key={avatarInputKey}
                name="avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarFileChange}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={uploading || !selectedAvatar}>
                  {uploading ? "Uploading..." : "Confirm upload avatar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading || !selectedAvatar}
                  onClick={clearAvatarSelection}
                >
                  Clear selection
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
