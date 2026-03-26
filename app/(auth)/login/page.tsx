"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { ApiError } from "@/lib/api/http";
import { useAuth } from "@/providers/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, initializing } = useAuth();
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

  useEffect(() => {
    if (!initializing && user) {
      router.replace("/dashboard");
    }
  }, [initializing, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login({ email, password });

      if (result.requiresTwoFactor) {
        const params = new URLSearchParams({
          token: result.twoFactorToken,
          email,
          expiresInSeconds: String(result.expiresInSeconds),
        });
        router.push(`/auth/2fa/verify?${params.toString()}`);
        return;
      }

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
    <main className="section-shell flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
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
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-[var(--primary)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            No account yet?{" "}
            <Link
              href="/register"
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
