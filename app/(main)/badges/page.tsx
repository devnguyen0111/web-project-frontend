"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from "@/components/ui";
import { listBadges } from "@/lib/api/badges";
import type { BadgeItem } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

export default function BadgesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await listBadges();
        if (active) {
          setItems(result);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load badges");
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
            <Badge className="w-fit">Gamification</Badge>
            <CardTitle>Badges catalog</CardTitle>
            <CardDescription>
              Explore active badges and criteria thresholds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <Link href="/badges/me">
                <Button variant="secondary">View my badges</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="secondary">Sign in to view my badges</Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner label="Loading badges" />
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
              No badges available.
            </CardContent>
          </Card>
        ) : null}

        {items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Badge variant="info">{item.code}</Badge>
                  <p className="text-[var(--text-secondary)]">
                    Criteria: {item.criteria.type} &gt;= {item.criteria.threshold}
                  </p>
                  <p className="text-[var(--text-secondary)]">XP reward: {item.xpReward}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
