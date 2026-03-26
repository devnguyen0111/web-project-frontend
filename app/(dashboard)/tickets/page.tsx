"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  Select,
  Textarea,
} from "@/components/ui";
import {
  assignAdminTicket,
  createTicket,
  listAdminTickets,
  listMyTickets,
  listTicketAssignees,
  updateAdminTicketStatus,
} from "@/lib/api/tickets";
import { isTicketStaffRole } from "@/lib/tickets-role";
import type {
  Ticket,
  TicketAssignee,
  TicketCategory,
  TicketPriority,
  TicketRelatedType,
  TicketStatus,
} from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

const CATEGORIES: TicketCategory[] = [
  "general",
  "order_issue",
  "payment",
  "custom_order",
  "product_quality",
  "refund",
  "account",
  "store_report",
  "bug_report",
  "feature_request",
];

const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];

const STATUS_OPTIONS: TicketStatus[] = [
  "open",
  "awaiting_user",
  "in_progress",
  "escalated",
  "resolved",
  "closed",
  "reopened",
];

type StaffInboxTab = "assigned" | "unassigned" | "all";

function getStaffModeLabel(tab: StaffInboxTab) {
  if (tab === "assigned") {
    return "Assigned to me";
  }
  if (tab === "unassigned") {
    return "Unassigned";
  }
  return "All";
}

export default function TicketsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const staffMode = isTicketStaffRole(user?.role);
  const isAdmin = user?.role === "admin";
  const [items, setItems] = useState<Ticket[]>([]);
  const [assignees, setAssignees] = useState<TicketAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<TicketCategory>("general");
  const [priority, setPriority] = useState<TicketPriority>("medium");

  const [staffTab, setStaffTab] = useState<StaffInboxTab>("assigned");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [keyword, setKeyword] = useState("");
  const [activeTicketId, setActiveTicketId] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [staffStatus, setStaffStatus] = useState<TicketStatus>("in_progress");
  const [statusNote, setStatusNote] = useState("");
  const [escalatedTo, setEscalatedTo] = useState("");

  const relatedFilter = useMemo(() => {
    const relatedType = searchParams.get("relatedType") as TicketRelatedType | null;
    const relatedId = searchParams.get("relatedId")?.trim() ?? "";
    if (!relatedType || !relatedId) {
      return {};
    }

    return { relatedType, relatedId };
  }, [searchParams]);

  const visibleStaffItems = useMemo(() => {
    if (!staffMode) {
      return [];
    }

    if (staffTab === "assigned") {
      return items.filter((item) => item.assignedTo === user?.id);
    }

    if (staffTab === "unassigned") {
      return items.filter((item) => !item.assignedTo);
    }

    return items;
  }, [items, staffMode, staffTab, user?.id]);

  const activeTicket = useMemo(
    () => visibleStaffItems.find((item) => item.id === activeTicketId) ?? null,
    [activeTicketId, visibleStaffItems],
  );
  const canUpdateTicketStatus = Boolean(
    activeTicket && (isAdmin || activeTicket.assignedTo === user?.id),
  );

  useEffect(() => {
    if (!staffMode) {
      return;
    }

    if (visibleStaffItems.length === 0) {
      if (activeTicketId) {
        setActiveTicketId("");
      }
      return;
    }

    if (!visibleStaffItems.some((item) => item.id === activeTicketId)) {
      setActiveTicketId(visibleStaffItems[0].id);
    }
  }, [activeTicketId, staffMode, visibleStaffItems]);

  useEffect(() => {
    if (!activeTicket) {
      setSelectedAssigneeId("");
      setStaffStatus("in_progress");
      setStatusNote("");
      setEscalatedTo("");
      return;
    }
    setSelectedAssigneeId(activeTicket.assignedTo ?? "");
    setStaffStatus(activeTicket.status);
    setStatusNote("");
    setEscalatedTo(activeTicket.escalatedTo ?? "");
  }, [activeTicket]);

  const loadAuthorTickets = useCallback(async () => {
    const result = await listMyTickets({ page: 1, limit: 20, ...relatedFilter });
    setItems(result.data);
  }, [relatedFilter]);

  const loadStaffTickets = useCallback(async () => {
    const result = await listAdminTickets({
      page: 1,
      limit: 50,
      status: statusFilter === "all" ? undefined : statusFilter,
      q: keyword.trim() || undefined,
      assignedTo: isAdmin && staffTab === "assigned" ? user?.id : undefined,
    });
    setItems(result.data);
  }, [isAdmin, keyword, staffTab, statusFilter, user?.id]);

  const loadAssignees = useCallback(async () => {
    const result = await listTicketAssignees();
    setAssignees(result);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        if (staffMode) {
          await Promise.all([loadStaffTickets(), loadAssignees()]);
        } else {
          await loadAuthorTickets();
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load tickets");
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
  }, [loadAssignees, loadAuthorTickets, loadStaffTickets, staffMode]);

  async function handleCreateTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      await createTicket({
        subject: subject.trim(),
        category,
        priority,
        message: body.trim(),
        relatedTo:
          relatedFilter.relatedType && relatedFilter.relatedId
            ? {
                type: relatedFilter.relatedType,
                id: relatedFilter.relatedId,
              }
            : undefined,
      });
      await loadAuthorTickets();
      setSubject("");
      setBody("");
      setCategory("general");
      setPriority("medium");
      setMessage("Ticket created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignToMe(ticketId: string) {
    if (!user?.id || !ticketId) {
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await assignAdminTicket(ticketId, { assignedTo: user.id });
      await loadStaffTickets();
      setActiveTicketId(ticketId);
      setMessage("Ticket assigned to you.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign ticket");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignSelected() {
    if (!isAdmin) {
      setError("Only admin can reassign tickets.");
      return;
    }
    if (!activeTicketId || !selectedAssigneeId) {
      setError("Select a ticket and assignee first.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await assignAdminTicket(activeTicketId, { assignedTo: selectedAssigneeId });
      await loadStaffTickets();
      setMessage("Ticket assignment updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assignment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateStatus() {
    if (!activeTicketId) {
      setError("Select a ticket first.");
      return;
    }
    if (!canUpdateTicketStatus) {
      setError("Claim this ticket first before updating status.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await updateAdminTicketStatus(activeTicketId, {
        status: staffStatus,
        note: statusNote.trim() || undefined,
        escalatedTo: staffStatus === "escalated" ? escalatedTo.trim() || undefined : undefined,
      });
      await loadStaffTickets();
      setMessage("Ticket status updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  }

  if (staffMode) {
    return (
      <main className="pb-14 pt-10">
        <section className="section-shell space-y-6">
          <Card>
              <CardHeader>
                <Badge className="w-fit">Staff Inbox</Badge>
                <CardTitle>Ticket operations</CardTitle>
                <CardDescription>
                  Review user tickets, claim or assign ownership, and keep status synchronized.
                </CardDescription>
              </CardHeader>
            </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inbox filters</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-4">
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="ticketSearch">Search</Label>
                <Input
                  id="ticketSearch"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Subject or ticket number"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="statusFilter">Status</Label>
                <Select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as TicketStatus | "all")}
                >
                  <option value="all">all</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tabFilter">View</Label>
                <Select
                  id="tabFilter"
                  value={staffTab}
                  onChange={(event) => setStaffTab(event.target.value as StaffInboxTab)}
                >
                  <option value="assigned">{getStaffModeLabel("assigned")}</option>
                  <option value="unassigned">{getStaffModeLabel("unassigned")}</option>
                  {isAdmin ? <option value="all">{getStaffModeLabel("all")}</option> : null}
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>{getStaffModeLabel(staffTab)} tickets</CardTitle>
                <CardDescription>Click a ticket to edit assignment and status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? <p className="text-sm text-[var(--text-secondary)]">Loading tickets...</p> : null}
                {!loading && visibleStaffItems.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)]">No tickets found for this view.</p>
                ) : null}
                {visibleStaffItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-[var(--radius-md)] border p-3 ${
                      activeTicketId === item.id
                        ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                        : "border-[var(--border)] bg-[var(--surface)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button
                        type="button"
                        className="space-y-1 text-left"
                        onClick={() => setActiveTicketId(item.id)}
                      >
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{item.subject}</p>
                        <p className="text-xs text-[var(--text-muted)]">{item.ticketNumber}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="info">{item.status}</Badge>
                          <Badge variant="warning">{item.priority}</Badge>
                          <Badge variant="neutral">messages: {item.messagesCount}</Badge>
                          <Badge variant="neutral">{item.assignedTo ? "assigned" : "unassigned"}</Badge>
                        </div>
                      </button>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/tickets/${item.id}`}>
                          <Button variant="secondary">Open detail</Button>
                        </Link>
                        {!item.assignedTo ? (
                          <Button onClick={() => void handleAssignToMe(item.id)} loading={submitting}>
                            Assign to me
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ticket side panel</CardTitle>
                <CardDescription>
                  {activeTicket
                    ? `Editing ${activeTicket.ticketNumber}`
                    : "Select a ticket from inbox to manage assignment and status."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeTicket ? (
                  <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">{activeTicket.ticketNumber}</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{activeTicket.subject}</p>
                    <Link href={`/tickets/${activeTicket.id}`} className="text-xs text-[var(--primary)] underline">
                      Open full ticket detail
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Select a ticket from the inbox to start.
                  </p>
                )}
                <div className="space-y-1.5">
                  {isAdmin ? (
                    <>
                      <Label htmlFor="assignee">Assignee</Label>
                      <Select
                        id="assignee"
                        value={selectedAssigneeId}
                        onChange={(event) => setSelectedAssigneeId(event.target.value)}
                      >
                        <option value="">Select assignee</option>
                        {assignees.map((assignee) => (
                          <option key={assignee.id} value={assignee.id}>
                            {assignee.fullName} ({assignee.role})
                          </option>
                        ))}
                      </Select>
                      <Button onClick={() => void handleAssignSelected()} loading={submitting} disabled={!activeTicket}>
                        Update assignee
                      </Button>
                    </>
                  ) : (
                    <>
                      <Label>Claim ticket</Label>
                      <Button
                        onClick={() => void handleAssignToMe(activeTicket?.id ?? "")}
                        loading={submitting}
                        disabled={!activeTicket || Boolean(activeTicket.assignedTo)}
                      >
                        Assign to me
                      </Button>
                    </>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    id="status"
                    value={staffStatus}
                    onChange={(event) => setStaffStatus(event.target.value as TicketStatus)}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="statusNote">Status note</Label>
                  <Textarea
                    id="statusNote"
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    maxLength={1000}
                    placeholder="Optional context for status update"
                  />
                </div>
                {staffStatus === "escalated" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="escalatedTo">Escalate to</Label>
                    <Select
                      id="escalatedTo"
                      value={escalatedTo}
                      onChange={(event) => setEscalatedTo(event.target.value)}
                    >
                      <option value="">Select staff/admin</option>
                      {assignees.map((assignee) => (
                        <option key={assignee.id} value={assignee.id}>
                          {assignee.fullName} ({assignee.role})
                        </option>
                      ))}
                    </Select>
                  </div>
                ) : null}
                <Button
                  onClick={() => void handleUpdateStatus()}
                  loading={submitting}
                  disabled={!activeTicket || !canUpdateTicketStatus}
                >
                  Apply status
                </Button>
                {!canUpdateTicketStatus && activeTicket ? (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Claim this ticket before applying status updates.
                  </p>
                ) : null}

                {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
                {message ? <p className="text-sm text-[var(--success)]">{message}</p> : null}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="pb-14 pt-10">
      <section className="section-shell space-y-6">
        <Card>
          <CardHeader>
            <Badge className="w-fit">Support</Badge>
            <CardTitle>My tickets</CardTitle>
            <CardDescription>
              Open support tickets, follow conversation updates, and track ticket status.
            </CardDescription>
            {relatedFilter.relatedId ? (
              <p className="text-sm text-[var(--text-secondary)]">
                New ticket will be linked to this order automatically.
              </p>
            ) : null}
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create ticket</CardTitle>
            <CardDescription>Start a new support conversation.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleCreateTicket}>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  minLength={3}
                  maxLength={200}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    id="category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value as TicketCategory)}
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    id="priority"
                    value={priority}
                    onChange={(event) => setPriority(event.target.value as TicketPriority)}
                  >
                    {PRIORITIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">Initial message</Label>
                <Textarea
                  id="message"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  minLength={1}
                  maxLength={4000}
                  required
                />
              </div>

              {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
              {message ? <p className="text-sm text-[var(--success)]">{message}</p> : null}

              <Button type="submit" loading={submitting}>
                Create ticket
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent tickets</CardTitle>
            <CardDescription>Latest 20 tickets from your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm text-[var(--text-secondary)]">Loading tickets...</p> : null}

            {!loading && items.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No tickets yet.</p>
            ) : null}

            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{item.subject}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {item.ticketNumber} | Updated {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "-"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="info">{item.status}</Badge>
                    <Badge variant="warning">{item.priority}</Badge>
                    <Badge variant="neutral">{item.category}</Badge>
                  </div>
                </div>
                <Link href={`/tickets/${item.id}`}>
                  <Button variant="secondary">Open</Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
