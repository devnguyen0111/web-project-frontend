"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from "@/components/ui";
import { listMyBadges } from "@/lib/api/badges";
import type { MyBadgeItem } from "@/lib/types";

export default function MyBadgesPage() {
  const [items, setItems] = useState<MyBadgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await listMyBadges();
        if (active) {
          setItems(result);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load my badges");
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

  return (
    <main className="pb-14 pt-10">
      <section className="section-shell space-y-6">
        <Card>
          <CardHeader>
            <Badge className="w-fit">My progression</Badge>
            <CardTitle>My badges</CardTitle>
            <CardDescription>Badges earned by your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/badges">
              <Button variant="secondary">View badge catalog</Button>
            </Link>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Loading my badges" />
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
              You do not have any badge yet.
            </CardContent>
          </Card>
        ) : null}

        {items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {item.badge?.name ?? "Unknown badge"}
                  </CardTitle>
                  <CardDescription>
                    Awarded at {new Date(item.awardedAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Badge variant="info">{item.badge?.code ?? "unknown"}</Badge>
                  <p className="text-[var(--text-secondary)]">
                    {item.badge?.description ?? "Badge metadata unavailable"}
                  </p>
                  <p className="text-[var(--text-secondary)]">
                    XP reward: {item.badge?.xpReward ?? 0}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
