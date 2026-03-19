"use client";

import Link from "next/link";
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
import { forgotPassword } from "@/lib/api/auth";

const smoothEase = [0.22, 1, 0.36, 1] as const;

const heroStats = [
  { label: "Reset", value: "6-digit code by email" },
  { label: "Focused", value: "One recovery path" },
  { label: "Responsive", value: "Readable on mobile" },
];

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const emailFromQuery = new URLSearchParams(window.location.search).get("email");
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await forgotPassword({ email });
      setSuccess(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="overflow-x-clip pb-16">
      <section className="page-bleed border-b border-cyan-200/70 bg-[linear-gradient(135deg,#f9fdff_0%,#e6f6ff_52%,#fff6d4_100%)] text-slate-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.18),transparent_24%)]" />
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
              Account recovery
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Recover access without leaving the full-width auth flow
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
                Request a reset code, then continue through a constrained and readable recovery form that
                matches the rest of the site.
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
                href="/login"
                className="rounded-full border border-cyan-200/80 bg-white/80 px-4 py-2 font-semibold text-slate-800 transition hover:bg-cyan-100/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Back to sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 font-semibold text-cyan-800 transition hover:bg-cyan-300/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Create account
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
                <CardTitle className="text-2xl">Forgot password</CardTitle>
                <CardDescription>
                  Enter your email to receive a 6-digit password reset code.
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

                  {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                  {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Sending..." : "Send reset code"}
                  </Button>
                </form>

                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link href="/login" className="font-semibold text-cyan-700 hover:underline">
                    Back to sign in
                  </Link>
                  <Link
                    href={`/reset-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                    className="font-semibold text-cyan-700 hover:underline"
                  >
                    Have code? Reset password
                  </Link>
                </div>
              </CardContent>
            </Card>
          </MotionDiv>
        </MotionSection>
      </section>
    </main>
  );
}
