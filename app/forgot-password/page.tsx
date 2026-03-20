"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { forgotPassword } from "@/lib/api/auth";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";

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
    <main className="section-shell flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>Enter your email to receive a 6-digit password reset code.</CardDescription>
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
    </main>
  );
}

