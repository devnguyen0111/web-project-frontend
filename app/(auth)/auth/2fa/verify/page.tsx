"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { verifyTwoFactor } from "@/lib/api/auth";

export default function TwoFactorVerifyPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [expiresInSeconds, setExpiresInSeconds] = useState("");
  const [email, setEmail] = useState("");

  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [generatedBackupCodes, setGeneratedBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token")?.trim() ?? "");
    setExpiresInSeconds(params.get("expiresInSeconds") ?? "");
    setEmail(params.get("email") ?? "");
  }, []);

  const expiresHint = useMemo(() => {
    if (!expiresInSeconds) {
      return "";
    }

    const seconds = Number(expiresInSeconds);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "";
    }

    const minutes = Math.ceil(seconds / 60);
    return `Challenge expires in about ${minutes} minute${minutes > 1 ? "s" : ""}.`;
  }, [expiresInSeconds]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setGeneratedBackupCodes([]);

    if (!token) {
      setError("Missing 2FA token. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const payload = useBackupCode
        ? { token, backupCode: backupCode.trim() }
        : { token, code: code.trim() };
      const result = await verifyTwoFactor(payload);

      if ("accessToken" in result) {
        setMessage("Two-factor verification successful. Redirecting...");
        router.push("/dashboard");
        return;
      }

      setGeneratedBackupCodes(result.backupCodes);
      setMessage("Two-factor setup completed. Save your backup codes securely.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Two-factor verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="section-shell flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Two-factor verification</CardTitle>
          <CardDescription>
            Complete the challenge for {email || "your account"}.
            {expiresHint ? ` ${expiresHint}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={useBackupCode ? "secondary" : "primary"}
                onClick={() => setUseBackupCode(false)}
              >
                Authenticator code
              </Button>
              <Button
                type="button"
                variant={useBackupCode ? "primary" : "secondary"}
                onClick={() => setUseBackupCode(true)}
              >
                Backup code
              </Button>
            </div>

            {!useBackupCode ? (
              <div className="space-y-1.5">
                <Label htmlFor="code">6-digit code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  required
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="backupCode">Backup code</Label>
                <Input
                  id="backupCode"
                  value={backupCode}
                  onChange={(event) => setBackupCode(event.target.value)}
                  placeholder="ABCD1234"
                  required
                />
              </div>
            )}

            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
            {message ? <p className="text-sm text-[var(--success)]">{message}</p> : null}

            <Button type="submit" loading={loading} className="w-full">
              Verify and continue
            </Button>
          </form>

          {generatedBackupCodes.length > 0 ? (
            <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--warning)] bg-[var(--warning-soft)] p-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Backup codes</p>
              <ul className="grid gap-1 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
                {generatedBackupCodes.map((item) => (
                  <li key={item} className="rounded bg-[var(--surface)] px-2 py-1 font-mono">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-sm text-[var(--text-secondary)]">
            Lost your token?{" "}
            <Link href="/login" className="font-semibold text-[var(--primary)] hover:underline">
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
