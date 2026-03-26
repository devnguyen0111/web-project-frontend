"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { enableTwoFactor, verifyTwoFactor } from "@/lib/api/auth";
import { useAuth } from "@/providers/auth-provider";

export default function EnableTwoFactorPage() {
  const router = useRouter();
  const { user, initializing, refreshProfile } = useAuth();
  const [setupToken, setSetupToken] = useState("");
  const [otpAuthUrl, setOtpAuthUrl] = useState("");
  const [manualEntryKey, setManualEntryKey] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!initializing && !user) {
      router.replace("/login");
    }
  }, [initializing, router, user]);

  async function handleInitSetup() {
    setLoadingSetup(true);
    setError("");
    setMessage("");

    try {
      const result = await enableTwoFactor();
      setSetupToken(result.setupToken);
      setOtpAuthUrl(result.otpAuthUrl);
      setManualEntryKey(result.manualEntryKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize 2FA setup");
    } finally {
      setLoadingSetup(false);
    }
  }

  async function handleVerifySetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const result = await verifyTwoFactor({
        token: setupToken,
        code: code.trim(),
      });

      if (!("backupCodes" in result)) {
        throw new Error("Unexpected verification response.");
      }

      setBackupCodes(result.backupCodes);
      setMessage("Two-factor authentication has been enabled.");
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify setup");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="section-shell flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Enable Two-factor Authentication</CardTitle>
          <CardDescription>
            Generate a setup token, add it to your authenticator app, then verify with a 6-digit code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!setupToken ? (
            <Button onClick={() => void handleInitSetup()} loading={loadingSetup}>
              Generate setup challenge
            </Button>
          ) : null}

          {setupToken ? (
            <>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Manual entry key</p>
                <p className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 font-mono text-sm">
                  {manualEntryKey}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">OTP Auth URL</p>
                <p className="break-all rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs">
                  {otpAuthUrl}
                </p>
              </div>

              <form className="space-y-3" onSubmit={handleVerifySetup}>
                <div className="space-y-1.5">
                  <Label htmlFor="totpCode">Authenticator code</Label>
                  <Input
                    id="totpCode"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    required
                  />
                </div>
                <Button type="submit" loading={submitting}>
                  Verify and enable
                </Button>
              </form>
            </>
          ) : null}

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          {message ? <p className="text-sm text-[var(--success)]">{message}</p> : null}

          {backupCodes.length > 0 ? (
            <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--warning)] bg-[var(--warning-soft)] p-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Save your backup codes now
              </p>
              <ul className="grid gap-1 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
                {backupCodes.map((item) => (
                  <li key={item} className="rounded bg-[var(--surface)] px-2 py-1 font-mono">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-sm text-[var(--text-secondary)]">
            Back to{" "}
            <Link href="/settings/security" className="font-semibold text-[var(--primary)] hover:underline">
              security settings
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
