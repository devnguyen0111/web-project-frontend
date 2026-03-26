"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select } from "@/components/ui";
import { listAuditLogs } from "@/lib/api/admin";
import type { AuditLogItem, AuditSeverity } from "@/lib/types";

const SEVERITY_OPTIONS: Array<AuditSeverity | "all"> = [
  "all",
  "info",
  "warning",
  "error",
];

export default function AdminAuditLogsPage() {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [action, setAction] = useState("");
  const [severity, setSeverity] = useState<AuditSeverity | "all">("all");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function loadLogs(targetPage = 1) {
    const result = await listAuditLogs({
      page: targetPage,
      limit: 20,
      action: action.trim() || undefined,
      severity: severity === "all" ? undefined : severity,
      userId: userId.trim() || undefined,
      from: from || undefined,
      to: to || undefined,
    });
    setItems(result.data);
    setPage(result.page);
    setTotalPages(Math.max(result.totalPages, 1));
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await listAuditLogs({ page: 1, limit: 20 });
        if (active) {
          setItems(result.data);
          setPage(result.page);
          setTotalPages(Math.max(result.totalPages, 1));
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load audit logs");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await loadLogs(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to filter audit logs");
    } finally {
      setLoading(false);
    }
  }

  async function handlePageChange(nextPage: number) {
    setLoading(true);
    setError("");
    try {
      await loadLogs(nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load page");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="pb-14 pt-10">
      <section className="section-shell space-y-6">
        <Card>
          <CardHeader>
            <Badge className="w-fit">Audit</Badge>
            <CardTitle>Audit logs</CardTitle>
            <CardDescription>
              Mutation endpoint logs with action/severity/user/date filters.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-3" onSubmit={handleFilter}>
              <div className="space-y-1.5">
                <Label htmlFor="action">Action</Label>
                <Input
                  id="action"
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                  placeholder="POST /auth/login"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="severity">Severity</Label>
                <Select
                  id="severity"
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value as AuditSeverity | "all")}
                >
                  {SEVERITY_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  placeholder="Mongo ObjectId"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="from">From (ISO)</Label>
                <Input
                  id="from"
                  type="datetime-local"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="to">To (ISO)</Label>
                <Input
                  id="to"
                  type="datetime-local"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" loading={loading}>
                  Apply filters
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-[var(--danger)] bg-[var(--danger-soft)]">
            <CardContent className="p-4 text-sm text-[var(--danger)]">{error}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              Page {page} / {totalPages}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && items.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">Loading audit logs...</p>
            ) : null}

            {items.length === 0 && !loading ? (
              <p className="text-sm text-[var(--text-secondary)]">No audit log entries found.</p>
            ) : null}

            {items.map((item) => (
              <div
                key={item._id}
                className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">{item.method}</Badge>
                  <Badge
                    variant={
                      item.severity === "error"
                        ? "danger"
                        : item.severity === "warning"
                          ? "warning"
                          : "info"
                    }
                  >
                    {item.severity}
                  </Badge>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                  {item.action}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  route: {item.route} | status: {item.statusCode} | user: {item.userId ?? "-"}
                </p>
                {item.errorMessage ? (
                  <p className="mt-1 text-xs text-[var(--danger)]">{item.errorMessage}</p>
                ) : null}
              </div>
            ))}

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1 || loading}
                onClick={() => void handlePageChange(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages || loading}
                onClick={() => void handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

