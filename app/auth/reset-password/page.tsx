"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { resetPassword } from "@/lib/api/auth";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { useAuth } from "@/providers/auth-provider";

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
    <main className="section-shell flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
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
    </main>
  );
}
