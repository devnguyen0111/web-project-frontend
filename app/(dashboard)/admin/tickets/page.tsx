"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export default function AdminTicketsAliasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tickets");
  }, [router]);

  return (
    <main className="pb-14 pt-10">
      <section className="section-shell">
        <Card>
          <CardHeader>
            <CardTitle>Ticket operations moved</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Redirecting to the shared staff inbox at <code>/tickets</code>.
            </p>
            <Link href="/tickets">
              <Button>Open ticket inbox</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
