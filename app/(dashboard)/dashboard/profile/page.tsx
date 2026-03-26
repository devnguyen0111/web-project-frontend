"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { MotionDiv, MotionSection } from "@/components/motion";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Spinner } from "@/components/ui";
import { getMyProfile, updateMyProfile, uploadMyAvatar } from "@/lib/api/users";
import type { AuthUser } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const smoothEase = [0.22, 1, 0.36, 1] as const;

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function ProfilePage() {
  const { refreshProfile } = useAuth();
  const [profile, setProfile] = useState<AuthUser | null>(null);
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
      .then((loadedProfile) => {
        setProfile(loadedProfile);
        setFullName(loadedProfile.fullName);
        setAvatarUrl(loadedProfile.avatarUrl ?? "");
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
      const updatedProfile = await updateMyProfile({ fullName });
      setProfile(updatedProfile);
      setFullName(updatedProfile.fullName);
      setAvatarUrl(updatedProfile.avatarUrl ?? "");
      await refreshProfile();
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
      setProfile(updated);
      setAvatarUrl(updated.avatarUrl ?? "");
      await refreshProfile();
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
      <MotionSection
        className="section-shell space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: smoothEase }}
      >
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04, ease: smoothEase }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Profile details</CardTitle>
              <CardDescription>Detailed account data from /users/me (including role)</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm text-slate-700 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Full name</dt>
                  <dd className="font-semibold text-slate-900">{profile?.fullName ?? "-"}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
                  <dd>{profile?.email ?? "-"}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Role</dt>
                  <dd className="font-semibold text-cyan-700">{profile?.role ?? "-"}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Email verified</dt>
                  <dd>{profile?.isEmailVerified ? "Verified" : "Not verified"}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Created at</dt>
                  <dd>{formatDateTime(profile?.createdAt)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Updated at</dt>
                  <dd>{formatDateTime(profile?.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </MotionDiv>

        <section className="grid gap-6 lg:grid-cols-2">
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3, ease: smoothEase }}
          >
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
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3, delay: 0.06, ease: smoothEase }}
          >
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
          </MotionDiv>
        </section>
      </MotionSection>
    </main>
  );
}

