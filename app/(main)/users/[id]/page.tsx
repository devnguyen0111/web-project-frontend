"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from "@/components/ui";
import {
  followUser,
  getUserFollowers,
  getUserFollowing,
  unfollowUser,
} from "@/lib/api/social";
import type { FollowUserItem } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

export default function UserSocialPage() {
  const params = useParams<{ id: string }>();
  const targetUserId = String(params.id ?? "");
  const { user } = useAuth();

  const [followers, setFollowers] = useState<FollowUserItem[]>([]);
  const [following, setFollowing] = useState<FollowUserItem[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    const [followersResult, followingResult] = await Promise.all([
      getUserFollowers(targetUserId, { page: 1, limit: 20 }),
      getUserFollowing(targetUserId, { page: 1, limit: 20 }),
    ]);

    setFollowers(followersResult.data);
    setFollowing(followingResult.data);
  }, [targetUserId]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        await loadData();
        const myFollowing = await getUserFollowing(user.id, { page: 1, limit: 200 });
        if (active) {
          setIsFollowing(myFollowing.data.some((item) => item.userId === targetUserId));
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load social profile");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [loadData, targetUserId, user]);

  async function handleToggleFollow() {
    if (!user || user.id === targetUserId) {
      return;
    }

    setBusy(true);
    setError("");
    const optimistic = !isFollowing;
    setIsFollowing(optimistic);

    try {
      if (optimistic) {
        await followUser(targetUserId);
      } else {
        await unfollowUser(targetUserId);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update follow state");
      setIsFollowing(!optimistic);
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <main className="pb-14 pt-10">
        <section className="section-shell">
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Please sign in to view social profile data.
              </p>
              <Link href="/login">
                <Button>Sign in</Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="pb-14 pt-10">
      <section className="section-shell space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge className="w-fit">Social</Badge>
                <CardTitle>User social profile</CardTitle>
                <CardDescription>User ID: {targetUserId}</CardDescription>
              </div>
              {user.id !== targetUserId ? (
                <Button
                  onClick={() => void handleToggleFollow()}
                  loading={busy}
                  variant={isFollowing ? "secondary" : "primary"}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </Button>
              ) : (
                <Badge variant="neutral">This is you</Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner label="Loading social profile" />
          </div>
        ) : null}

        {error ? (
          <Card className="border-[var(--danger)] bg-[var(--danger-soft)]">
            <CardContent className="p-4 text-sm text-[var(--danger)]">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Followers ({followers.length})</CardTitle>
              <CardDescription>Users following this profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {followers.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">No followers yet.</p>
              ) : null}
              {followers.map((item) => (
                <div key={`${item.userId}-${item.followedAt}`} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {item.fullName ?? item.userId}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Followed at {new Date(item.followedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Following ({following.length})</CardTitle>
              <CardDescription>Users this profile is following.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {following.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">Not following anyone yet.</p>
              ) : null}
              {following.map((item) => (
                <div key={`${item.userId}-${item.followedAt}`} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {item.fullName ?? item.userId}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Followed at {new Date(item.followedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
