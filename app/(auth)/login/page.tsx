"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
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
} from "@/components/ui";
import { ApiError } from "@/lib/api/http";
import { useAuth } from "@/providers/auth-provider";

const smoothEase = [0.22, 1, 0.36, 1] as const;

const heroStats = [
  { label: "Protected", value: "Auth + dashboard access" },
  { label: "Verified", value: "Email-based sign-in flow" },
  { label: "Fast", value: "Guided, responsive layout" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("author.phase2@example.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const emailFromQuery = new URLSearchParams(window.location.search).get("email");
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ email, password });
      router.push("/dashboard");
    } catch (err) {
      const isUnverifiedEmailError =
        err instanceof ApiError &&
        err.statusCode === 403 &&
        err.message.toLowerCase().includes("email is not verified");

      if (isUnverifiedEmailError) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}&from=login`);
        return;
      }

      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="overflow-x-clip pb-16">
      <section className="page-bleed border-b border-cyan-200/70 bg-[linear-gradient(135deg,#f9fdff_0%,#e6f6ff_52%,#fff6d4_100%)] text-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.2),transparent_24%)]" />
        <MotionSection
          className="page-hero-shell grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: smoothEase }}
        >
          <MotionDiv
            className="space-y-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.04, ease: smoothEase }}
          >
            <Badge className="w-fit border border-cyan-200/80 bg-white/80 text-slate-800">
              Protected area
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Sign in to the dashboard workspace
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
                Use one secure account to reach author tools, moderation views, and wallet actions inside a
                consistent full-width shell.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {heroStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-cyan-200/80 bg-white/80 px-4 py-3 shadow-[0_16px_40px_rgba(2,6,23,0.12)] backdrop-blur"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                href="/register"
                className="rounded-full border border-cyan-200/80 bg-white/80 px-4 py-2 font-semibold text-slate-800 transition hover:bg-cyan-100/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Create account
              </Link>
              <Link
                href="/subscription"
                className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 font-semibold text-cyan-800 transition hover:bg-cyan-300/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                View plans
              </Link>
            </div>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.42, delay: 0.08, ease: smoothEase }}
          >
            <Card className="surface-card border-white/40 bg-white/95 shadow-[0_28px_80px_rgba(2,6,23,0.22)]">
              <CardHeader>
                <CardTitle className="text-2xl">Sign in</CardTitle>
                <CardDescription>
                  Use your account to access dashboard features and moderation workflows.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </div>

                  <div className="text-right">
                    <Link href="/forgot-password" className="text-sm font-medium text-cyan-700 hover:underline">
                      Forgot password?
                    </Link>
                  </div>

                  {error ? <p className="text-sm text-rose-600">{error}</p> : null}

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>

                <p className="mt-4 text-sm text-slate-600">
                  No account yet?{" "}
                  <Link href="/register" className="font-semibold text-cyan-700 hover:underline">
                    Create one
                  </Link>
                </p>
              </CardContent>
            </Card>
          </MotionDiv>
        </MotionSection>
      </section>
    </main>
  );
}
