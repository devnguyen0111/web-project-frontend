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
import { verifyEmail } from "@/lib/api/auth";

const smoothEase = [0.22, 1, 0.36, 1] as const;

const heroStats = [
  { label: "Verify", value: "6-digit confirmation code" },
  { label: "State-aware", value: "Register or login context" },
  { label: "Accessible", value: "Clear, high-contrast flow" },
];

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [helperText, setHelperText] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const emailFromQuery = query.get("email");
    const source = query.get("from");

    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
    if (source === "register") {
      setHelperText("Registration complete. Enter the 6-digit code sent to your email.");
      return;
    }
    if (source === "login") {
      setHelperText("Your account is not verified yet. A new verification code has been sent.");
      return;
    }
    setHelperText("");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (code.length !== 6) {
      setError("Verification code must contain 6 digits");
      return;
    }

    setLoading(true);
    try {
      const response = await verifyEmail({ email, code });
      setSuccess(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email verification failed");
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
              Verify email
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                Confirm your account without losing the layout context
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
                Verification stays inside the same visual system as login and registration, with the form
                constrained for readability and the background expanded edge-to-edge.
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
                href="/forgot-password"
                className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 font-semibold text-cyan-800 transition hover:bg-cyan-300/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Request reset code
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
                <CardTitle className="text-2xl">Verify email</CardTitle>
                <CardDescription>
                  Confirm your account using the verification code from your email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  {helperText ? (
                    <p className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-800">
                      {helperText}
                    </p>
                  ) : null}

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
                    <Label htmlFor="code">Verification code</Label>
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

                  {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                  {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? "Verifying..." : "Verify email"}
                  </Button>
                </form>

                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link href="/login" className="font-semibold text-cyan-700 hover:underline">
                    Back to sign in
                  </Link>
                  <Link href="/forgot-password" className="font-semibold text-cyan-700 hover:underline">
                    Forgot password
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
