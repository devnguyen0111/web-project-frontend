"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { verifyEmail } from "@/lib/api/auth";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";

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
    <main className="section-shell flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify email</CardTitle>
          <CardDescription>Confirm your account using the verification code from your email.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {helperText ? <p className="rounded-lg bg-cyan-50 px-3 py-2 text-sm text-cyan-800">{helperText}</p> : null}

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
    </main>
  );
}


