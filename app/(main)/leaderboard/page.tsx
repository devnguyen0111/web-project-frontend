"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from "@/components/ui";
import { getLeaderboard, getUserFollowing, followUser, unfollowUser } from "@/lib/api/social";
import type { LeaderboardEntry } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<LeaderboardEntry[]>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  async function loadLeaderboard(targetPage: number) {
    const result = await getLeaderboard({ page: targetPage, limit: 20 });
    setItems(result.data);
    setPage(result.page);
    setTotalPages(Math.max(result.totalPages, 1));
  }

  async function loadFollowing(userId: string) {
    const result = await getUserFollowing(userId, { page: 1, limit: 200 });
    setFollowingSet(new Set(result.data.map((item) => item.userId)));
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        await loadLeaderboard(1);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load leaderboard");
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
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setFollowingSet(new Set());
      return;
    }

    let active = true;
    void (async () => {
      try {
        const result = await getUserFollowing(user.id, { page: 1, limit: 200 });
        if (active) {
          setFollowingSet(new Set(result.data.map((item) => item.userId)));
        }
      } catch {
        if (active) {
          setFollowingSet(new Set());
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.id]);

  async function handleToggleFollow(targetUserId: string) {
    if (!user?.id || user.id === targetUserId) {
      return;
    }

    const currentlyFollowing = followingSet.has(targetUserId);
    const nextSet = new Set(followingSet);
    if (currentlyFollowing) {
      nextSet.delete(targetUserId);
    } else {
      nextSet.add(targetUserId);
    }

    setBusyUserId(targetUserId);
    setFollowingSet(nextSet);

    try {
      if (currentlyFollowing) {
        await unfollowUser(targetUserId);
      } else {
        await followUser(targetUserId);
      }
      if (user?.id) {
        await loadFollowing(user.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update follow status");
      if (user?.id) {
        await loadFollowing(user.id);
      }
    } finally {
      setBusyUserId(null);
    }
  }

  async function handlePageChange(nextPage: number) {
    setLoading(true);
    setError("");
    try {
      await loadLeaderboard(nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load page");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="pb-14 pt-10">
      <section className="section-shell space-y-6">
        <Card>
          <CardHeader>
            <Badge className="w-fit">Gamification</Badge>
            <CardTitle>Leaderboard</CardTitle>
            <CardDescription>
              Ranking by XP, level, sales, and social metrics.
            </CardDescription>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Loading leaderboard" />
          </div>
        ) : null}

        {error ? (
          <Card className="border-[var(--danger)] bg-[var(--danger-soft)]">
            <CardContent className="p-4 text-sm text-[var(--danger)]">{error}</CardContent>
          </Card>
        ) : null}

        {!loading && items.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-[var(--text-secondary)]">
              No leaderboard data available.
            </CardContent>
          </Card>
        ) : null}

        {items.length > 0 ? (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--surface-muted)] text-left text-xs uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">XP</th>
                    <th className="px-4 py-3">Posts</th>
                    <th className="px-4 py-3">Sales</th>
                    <th className="px-4 py-3">Followers</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isSelf = user?.id === item.userId;
                    const isFollowing = followingSet.has(item.userId);
                    const busy = busyUserId === item.userId;

                    return (
                      <tr key={item.userId} className="border-t border-[var(--border)]">
                        <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">#{item.rank}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <p className="font-semibold text-[var(--text-primary)]">{item.fullName}</p>
                            <Link
                              href={`/users/${item.userId}`}
                              className="text-xs text-[var(--primary)] hover:underline"
                            >
                              View social profile
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3">{item.gamification.level}</td>
                        <td className="px-4 py-3">{item.gamification.xp}</td>
                        <td className="px-4 py-3">{item.gamification.postsPublished}</td>
                        <td className="px-4 py-3">{item.gamification.salesCount}</td>
                        <td className="px-4 py-3">{item.followersCount}</td>
                        <td className="px-4 py-3">
                          {isSelf ? (
                            <Badge variant="neutral">You</Badge>
                          ) : (
                            <Button
                              variant={isFollowing ? "secondary" : "primary"}
                              onClick={() => void handleToggleFollow(item.userId)}
                              loading={busy}
                              disabled={!user}
                            >
                              {isFollowing ? "Unfollow" : "Follow"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            disabled={page <= 1 || loading}
            onClick={() => void handlePageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={page >= totalPages || loading}
            onClick={() => void handlePageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </section>
    </main>
  );
}
