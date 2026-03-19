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
import { resetPassword } from "@/lib/api/auth";
import { useAuth } from "@/providers/auth-provider";

const smoothEase = [0.22, 1, 0.36, 1] as const;

const heroStats = [
  { label: "Step 1", value: "Confirm identity" },
  { label: "Step 2", value: "Verify code" },
  { label: "Step 3", value: "Set a new password" },
];

export default function ResetPasswordPage() {
  const router = useRouter();
  const { clearSession } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    if (code.length !== 6) {
      setError("Reset code must contain 6 digits");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must have at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Confirm password does not match");
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword({ email, code, newPassword });
      clearSession();
      setSuccess(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
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
              Reset password
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Set a new password in a calm, constrained recovery form
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
                The reset screen keeps each step explicit, with code entry, password confirmation, and
                success feedback all in one readable flow.
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
                href="/forgot-password"
                className="rounded-full border border-cyan-200/80 bg-white/80 px-4 py-2 font-semibold text-slate-800 transition hover:bg-cyan-100/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Request another code
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 font-semibold text-cyan-800 transition hover:bg-cyan-300/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Back to sign in
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
                <CardTitle className="text-2xl">Reset password</CardTitle>
                <CardDescription>Enter your email, reset code, and new password.</CardDescription>
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
                    <Label htmlFor="code">Reset code</Label>
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">New password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      minLength={6}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      minLength={6}
                      required
                    />
                  </div>

                  {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                  {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Resetting..." : "Reset password"}
                  </Button>
                </form>

                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link href="/forgot-password" className="font-semibold text-cyan-700 hover:underline">
                    Request another code
                  </Link>
                  <Link href="/login" className="font-semibold text-cyan-700 hover:underline">
                    Back to sign in
                  </Link>
                  {success ? (
                    <button
                      type="button"
                      className="font-semibold text-cyan-700 hover:underline"
                      onClick={() => router.push(`/login?email=${encodeURIComponent(email)}`)}
                    >
                      Continue to login
                    </button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </MotionDiv>
        </MotionSection>
      </section>
    </main>
  );
}
