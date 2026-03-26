"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
import { getAccessToken } from "@/lib/api/token-store";
import {
  addTicketMessage,
  assignAdminTicket,
  closeTicket,
  createAdminTicketInternalNote,
  getTicketDetail,
  listTicketAssignees,
  rateTicket,
  reopenTicket,
  updateAdminTicketStatus,
} from "@/lib/api/tickets";
import { uploadTicketAttachment } from "@/lib/api/upload";
import { connectTicketsSocket } from "@/lib/realtime/tickets-socket";
import { applyTicketUpdate, mergeTicketMessages } from "@/lib/realtime/tickets-state";
import {
  canOwnerCloseTicket,
  canOwnerRateTicket,
  canOwnerReopenTicket,
  isTicketOwner,
  isTicketStaffRole,
} from "@/lib/tickets-role";
import type {
  TicketAssignee,
  TicketDetail,
  TicketMessage,
  TicketMessageAttachment,
  TicketStatus,
} from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

const STATUS_OPTIONS: TicketStatus[] = [
  "open",
  "awaiting_user",
  "in_progress",
  "escalated",
  "resolved",
  "closed",
  "reopened",
];

const STAFF_STATUS_OPTIONS: TicketStatus[] = [
  "in_progress",
  "awaiting_user",
  "resolved",
  "escalated",
];

function resolveMessageSource(message: TicketMessage, ownerId: string) {
  if (message.isSystem) {
    return { label: "system", tone: "warning" as const };
  }
  if (message.isInternal) {
    return { label: "internal", tone: "danger" as const };
  }
  if (message.senderId === ownerId) {
    return { label: "user", tone: "info" as const };
  }
  return { label: "staff", tone: "success" as const };
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = String(params.id ?? "");
  const { user } = useAuth();
  const staffMode = isTicketStaffRole(user?.role);
  const isAdmin = user?.role === "admin";

  const [data, setData] = useState<TicketDetail | null>(null);
  const [assignees, setAssignees] = useState<TicketAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [closeReason, setCloseReason] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [staffStatus, setStaffStatus] = useState<TicketStatus>("in_progress");
  const [statusNote, setStatusNote] = useState("");
  const [escalatedTo, setEscalatedTo] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [internalNoteFiles, setInternalNoteFiles] = useState<File[]>([]);

  const isOwner = useMemo(
    () => isTicketOwner(user?.id, data?.ticket.createdBy),
    [data?.ticket.createdBy, user?.id],
  );

  const canClose = useMemo(
    () => canOwnerCloseTicket(data?.ticket.status, isOwner),
    [data?.ticket.status, isOwner],
  );

  const canReopen = useMemo(
    () => canOwnerReopenTicket(data?.ticket.status, isOwner),
    [data?.ticket.status, isOwner],
  );

  const canRate = useMemo(
    () => canOwnerRateTicket(data?.ticket.status, isOwner, Boolean(data?.ticket.satisfaction?.rating)),
    [data?.ticket.status, data?.ticket.satisfaction?.rating, isOwner],
  );

  const canStaffOperate = useMemo(
    () => Boolean(isAdmin || (data?.ticket.assignedTo && data.ticket.assignedTo === user?.id)),
    [data?.ticket.assignedTo, isAdmin, user?.id],
  );

  const canStaffClaim = useMemo(
    () => Boolean(!isAdmin && staffMode && data?.ticket && !data.ticket.assignedTo && user?.id),
    [data?.ticket, isAdmin, staffMode, user?.id],
  );

  const statusOptions = useMemo(() => {
    const base = isAdmin ? STATUS_OPTIONS : STAFF_STATUS_OPTIONS;
    if (base.includes(staffStatus)) {
      return base;
    }
    return [staffStatus, ...base];
  }, [isAdmin, staffStatus]);

  const escalationAssignees = useMemo(() => {
    if (isAdmin) {
      return assignees;
    }
    return assignees.filter((item) => item.role === "admin");
  }, [assignees, isAdmin]);

  const loadDetail = useCallback(async () => {
    const result = await getTicketDetail(ticketId);
    setData(result);
    setAssignedTo(result.ticket.assignedTo ?? "");
    setStaffStatus(result.ticket.status);
    setEscalatedTo(result.ticket.escalatedTo ?? "");
  }, [ticketId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        await loadDetail();
        if (staffMode) {
          const nextAssignees = await listTicketAssignees();
          if (active) {
            setAssignees(nextAssignees);
          }
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load ticket detail");
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
  }, [loadDetail, staffMode]);

  useEffect(() => {
    if (!ticketId) {
      return;
    }

    const initialToken = getAccessToken();
    if (!initialToken) {
      return;
    }

    let active = true;
    let socketConnection: Awaited<ReturnType<typeof connectTicketsSocket>> | null = null;

    void (async () => {
      try {
        socketConnection = await connectTicketsSocket({
          token: initialToken,
          getToken: getAccessToken,
          onReady: () => {
            if (!active) {
              return;
            }
            setRealtimeConnected(true);
            socketConnection?.subscribe(ticketId);
          },
          onMessage: (payload) => {
            if (!active || payload.ticketId !== ticketId) {
              return;
            }
            setData((previous) => {
              if (!previous) {
                return previous;
              }
              return {
                ...previous,
                messages: mergeTicketMessages(previous.messages, payload.message),
              };
            });
          },
          onTicketUpdated: (payload) => {
            if (!active || payload.ticket.id !== ticketId) {
              return;
            }
            setData((previous) => {
              if (!previous) {
                return previous;
              }
              return applyTicketUpdate(previous, payload.ticket);
            });
            setAssignedTo(payload.ticket.assignedTo ?? "");
            setStaffStatus(payload.ticket.status);
            setEscalatedTo(payload.ticket.escalatedTo ?? "");
          },
          onError: (payload) => {
            if (!active) {
              return;
            }
            setRealtimeConnected(false);
            if (payload.message) {
              setError(payload.message);
            }
          },
        });
        if (active) {
          socketConnection.subscribe(ticketId);
        }
      } catch {
        if (active) {
          setRealtimeConnected(false);
        }
      }
    })();

    return () => {
      active = false;
      setRealtimeConnected(false);
      if (socketConnection) {
        socketConnection.unsubscribe(ticketId);
        socketConnection.disconnect();
      }
    };
  }, [ticketId]);

  async function uploadFiles(files: File[]): Promise<TicketMessageAttachment[]> {
    if (!files.length) {
      return [];
    }

    const uploaded: TicketMessageAttachment[] = [];
    for (const file of files) {
      uploaded.push(await uploadTicketAttachment(file));
    }

    return uploaded;
  }

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reply.trim()) {
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const attachments = await uploadFiles(replyFiles);
      const createdMessage = await addTicketMessage(ticketId, {
        content: reply.trim(),
        attachments: attachments.length ? attachments : undefined,
      });
      setData((previous) => {
        if (!previous) {
          return previous;
        }
        return {
          ...previous,
          messages: mergeTicketMessages(previous.messages, createdMessage),
        };
      });
      if (!realtimeConnected) {
        await loadDetail();
      }
      setReply("");
      setReplyFiles([]);
      setMessage("Reply sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose() {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await closeTicket(ticketId, { reason: closeReason.trim() || undefined });
      await loadDetail();
      setCloseReason("");
      setMessage("Ticket closed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close ticket");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReopen() {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await reopenTicket(ticketId, { reason: reopenReason.trim() || undefined });
      await loadDetail();
      setReopenReason("");
      setMessage("Ticket reopened.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reopen ticket");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await rateTicket(ticketId, {
        rating,
        comment: ratingComment.trim() || undefined,
      });
      await loadDetail();
      setMessage("Thanks for your feedback.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignTicket() {
    if (!isAdmin) {
      setError("Only admin can update assignment.");
      return;
    }
    if (!assignedTo) {
      setError("Select assignee first.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await assignAdminTicket(ticketId, { assignedTo });
      await loadDetail();
      setMessage("Assignee updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign ticket");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClaimTicket() {
    if (!canStaffClaim || !user?.id) {
      setError("This ticket cannot be claimed.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await assignAdminTicket(ticketId, { assignedTo: user.id });
      if (!realtimeConnected) {
        await loadDetail();
      }
      setMessage("Ticket assigned to you.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim ticket");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusUpdate() {
    if (!isAdmin && !canStaffOperate) {
      setError("Claim this ticket first before updating status.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await updateAdminTicketStatus(ticketId, {
        status: staffStatus,
        note: statusNote.trim() || undefined,
        escalatedTo: staffStatus === "escalated" ? escalatedTo.trim() || undefined : undefined,
      });
      if (!realtimeConnected) {
        await loadDetail();
      }
      setStatusNote("");
      setMessage("Status updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInternalNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!internalNote.trim()) {
      return;
    }
    if (!isAdmin && !canStaffOperate) {
      setError("Claim this ticket first before adding internal note.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const attachments = await uploadFiles(internalNoteFiles);
      const note = await createAdminTicketInternalNote(ticketId, {
        content: internalNote.trim(),
        attachments: attachments.length ? attachments : undefined,
      });
      setData((previous) => {
        if (!previous) {
          return previous;
        }
        return {
          ...previous,
          messages: mergeTicketMessages(previous.messages, note),
        };
      });
      if (!realtimeConnected) {
        await loadDetail();
      }
      setInternalNote("");
      setInternalNoteFiles([]);
      setMessage("Internal note added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add internal note");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="pb-14 pt-10">
        <section className="section-shell">
          <Card>
            <CardContent className="p-4 text-sm text-[var(--text-secondary)]">Loading ticket...</CardContent>
          </Card>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="pb-14 pt-10">
        <section className="section-shell">
          <Card>
            <CardContent className="space-y-3 p-4">
              <p className="text-sm text-[var(--danger)]">{error || "Ticket not found."}</p>
              <Link href="/tickets">
                <Button variant="secondary">Back to tickets</Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="pb-14 pt-10">
      <section className="section-shell space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <Badge className="w-fit">Ticket detail</Badge>
                <CardTitle>{data.ticket.subject}</CardTitle>
                <CardDescription>{data.ticket.ticketNumber}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="info">{data.ticket.status}</Badge>
                <Badge variant="warning">{data.ticket.priority}</Badge>
                <Badge variant="neutral">{data.ticket.category}</Badge>
                <Badge variant={realtimeConnected ? "success" : "neutral"}>
                  {realtimeConnected ? "realtime connected" : "realtime offline"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Created: {data.ticket.createdAt ? new Date(data.ticket.createdAt).toLocaleString() : "-"}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              Last update: {data.ticket.updatedAt ? new Date(data.ticket.updatedAt).toLocaleString() : "-"}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              Owner: {data.ticket.createdBy}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/tickets">
                <Button variant="secondary">Back to tickets</Button>
              </Link>
              {canClose ? (
                <Button variant="danger" onClick={() => void handleClose()} disabled={submitting}>
                  Close ticket
                </Button>
              ) : null}
              {canReopen ? (
                <Button onClick={() => void handleReopen()} disabled={submitting}>
                  Reopen ticket
                </Button>
              ) : null}
            </div>
            {isOwner ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="closeReason">Close reason (optional)</Label>
                  <Input
                    id="closeReason"
                    value={closeReason}
                    onChange={(event) => setCloseReason(event.target.value)}
                    placeholder="Issue resolved"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reopenReason">Reopen reason (optional)</Label>
                  <Input
                    id="reopenReason"
                    value={reopenReason}
                    onChange={(event) => setReopenReason(event.target.value)}
                    placeholder="Need additional support"
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {error ? (
          <Card className="border-[var(--danger)] bg-[var(--danger-soft)]">
            <CardContent className="p-4 text-sm text-[var(--danger)]">{error}</CardContent>
          </Card>
        ) : null}

        {message ? (
          <Card className="border-[var(--success)] bg-[var(--success-soft)]">
            <CardContent className="p-4 text-sm text-[var(--success)]">{message}</CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
              <CardDescription>Reply and track ticket history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.messages.map((item) => {
                const source = resolveMessageSource(item, data.ticket.createdBy);
                return (
                  <div
                    key={item.id}
                    className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={source.tone}>{source.label}</Badge>
                      <p className="text-xs text-[var(--text-muted)]">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                      </p>
                      {item.senderId ? (
                        <p className="text-xs text-[var(--text-muted)]">sender: {item.senderId}</p>
                      ) : null}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-primary)]">{item.content}</p>
                    {item.attachments.length > 0 ? (
                      <div className="mt-2 space-y-1 text-xs">
                        {item.attachments.map((attachment) => (
                          <a
                            key={`${item.id}-${attachment.url}`}
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-[var(--primary)] underline"
                          >
                            {attachment.fileName}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <form className="space-y-2" onSubmit={handleReply}>
                <Label htmlFor="reply">Reply</Label>
                <Textarea
                  id="reply"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  minLength={1}
                  maxLength={4000}
                  required
                />
                <div className="space-y-1">
                  <Label htmlFor="replyAttachments">Attachments</Label>
                  <Input
                    id="replyAttachments"
                    type="file"
                    multiple
                    onChange={(event) => {
                      const files = event.target.files ? Array.from(event.target.files) : [];
                      setReplyFiles(files);
                    }}
                  />
                  {replyFiles.length > 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      {replyFiles.length} file(s): {replyFiles.map((item) => item.name).join(", ")}
                    </p>
                  ) : null}
                </div>
                <Button type="submit" loading={submitting}>
                  Send reply
                </Button>
              </form>
            </CardContent>
          </Card>

          {staffMode ? (
            <Card>
              <CardHeader>
                <CardTitle>Staff actions</CardTitle>
                <CardDescription>Internal controls for assignment and lifecycle updates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAdmin ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="assignTo">Assign to</Label>
                    <Select id="assignTo" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}>
                      <option value="">Select assignee</option>
                      {assignees.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.fullName} ({item.role})
                        </option>
                      ))}
                    </Select>
                    <Button onClick={() => void handleAssignTicket()} loading={submitting}>
                      Update assignee
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Claim ticket</Label>
                    <Button
                      onClick={() => void handleClaimTicket()}
                      loading={submitting}
                      disabled={!canStaffClaim}
                    >
                      Assign to me
                    </Button>
                    {!canStaffOperate ? (
                      <p className="text-xs text-[var(--text-secondary)]">
                        Claim this ticket to use status and internal-note actions.
                      </p>
                    ) : null}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="status">Status</Label>
                  <Select id="status" value={staffStatus} onChange={(event) => setStaffStatus(event.target.value as TicketStatus)}>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                  <Textarea
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    maxLength={1000}
                    placeholder="Status update note (optional)"
                  />
                  {staffStatus === "escalated" ? (
                    <Select value={escalatedTo} onChange={(event) => setEscalatedTo(event.target.value)}>
                      <option value="">Escalate to...</option>
                      {escalationAssignees.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.fullName} ({item.role})
                        </option>
                      ))}
                    </Select>
                  ) : null}
                  <Button onClick={() => void handleStatusUpdate()} loading={submitting} disabled={!isAdmin && !canStaffOperate}>
                    Apply status
                  </Button>
                </div>

                <form className="space-y-1.5" onSubmit={handleInternalNote}>
                  <Label htmlFor="internalNote">Internal note</Label>
                  <Textarea
                    id="internalNote"
                    value={internalNote}
                    onChange={(event) => setInternalNote(event.target.value)}
                    minLength={1}
                    maxLength={4000}
                    placeholder="Visible to staff/admin only"
                    required
                  />
                  <div className="space-y-1">
                    <Label htmlFor="internalAttachments">Attachments</Label>
                    <Input
                      id="internalAttachments"
                      type="file"
                      multiple
                      onChange={(event) => {
                        const files = event.target.files ? Array.from(event.target.files) : [];
                        setInternalNoteFiles(files);
                      }}
                    />
                    {internalNoteFiles.length > 0 ? (
                      <p className="text-xs text-[var(--text-muted)]">
                        {internalNoteFiles.length} file(s): {internalNoteFiles.map((item) => item.name).join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <Button type="submit" loading={submitting} disabled={!isAdmin && !canStaffOperate}>
                    Add internal note
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {canRate ? (
          <Card>
            <CardHeader>
              <CardTitle>Rate support</CardTitle>
              <CardDescription>Share feedback after resolution.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleRate}>
                <div className="space-y-1.5">
                  <Label htmlFor="rating">Rating (1-5)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min={1}
                    max={5}
                    value={rating}
                    onChange={(event) => setRating(Number(event.target.value))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comment">Comment (optional)</Label>
                  <Textarea
                    id="comment"
                    value={ratingComment}
                    onChange={(event) => setRatingComment(event.target.value)}
                    maxLength={1000}
                  />
                </div>
                <Button type="submit" loading={submitting}>
                  Submit rating
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
