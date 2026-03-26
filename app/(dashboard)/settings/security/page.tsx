"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { disableTwoFactor } from "@/lib/api/auth";
import { useAuth } from "@/providers/auth-provider";

export default function SecuritySettingsPage() {
  const { user, refreshProfile } = useAuth();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const twoFactorEnabled = user?.twoFactor?.enabled === true;

  async function handleDisable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await disableTwoFactor({
        password,
        code: useBackupCode ? undefined : code.trim(),
        backupCode: useBackupCode ? backupCode.trim() : undefined,
      });
      await refreshProfile();
      setPassword("");
      setCode("");
      setBackupCode("");
      setMessage("Two-factor authentication disabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable 2FA");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="pb-14 pt-10">
      <section className="section-shell space-y-6">
        <Card>
          <CardHeader>
            <Badge className="w-fit">Security</Badge>
            <CardTitle>Account security settings</CardTitle>
            <CardDescription>
              Manage two-factor authentication and challenge recovery options.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Current 2FA status:{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {twoFactorEnabled ? "Enabled" : "Disabled"}
              </span>
            </p>
            {user?.twoFactor?.enabledAt ? (
              <p className="text-sm text-[var(--text-secondary)]">
                Enabled at: {new Date(user.twoFactor.enabledAt).toLocaleString()}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {!twoFactorEnabled ? (
          <Card>
            <CardHeader>
              <CardTitle>Enable two-factor authentication</CardTitle>
              <CardDescription>
                Add an extra security step to protect your account at login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/auth/2fa/enable">
                <Button>Enable 2FA</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Disable two-factor authentication</CardTitle>
              <CardDescription>
                Confirm your password and provide either authenticator code or a backup code.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-4" onSubmit={handleDisable}>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Current password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>

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
                    <Label htmlFor="disableCode">Authenticator code</Label>
                    <Input
                      id="disableCode"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      inputMode="numeric"
                      placeholder="123456"
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="disableBackupCode">Backup code</Label>
                    <Input
                      id="disableBackupCode"
                      value={backupCode}
                      onChange={(event) => setBackupCode(event.target.value)}
                      placeholder="ABCD1234"
                      required
                    />
                  </div>
                )}

                {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
                {message ? <p className="text-sm text-[var(--success)]">{message}</p> : null}

                <Button type="submit" loading={loading} variant="danger">
                  Disable 2FA
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
