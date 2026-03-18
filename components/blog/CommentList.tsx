"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { Badge, Button, Textarea } from "@/components/ui";
import type { Comment, Role } from "@/lib/types";

type CommentActionMode = "reply" | "edit" | "hide" | null;

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string | null;
  currentUserRole?: Role | null;
  isAuthenticated: boolean;
  onReply?: (commentId: string, content: string) => Promise<void>;
  onEdit?: (commentId: string, content: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  onHide?: (commentId: string, reason?: string) => Promise<void>;
}

function getInitials(fullName?: string | null) {
  if (!fullName) {
    return "AN";
  }

  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "AN";
}

function CommentItem({
  comment,
  currentUserId,
  currentUserRole,
  isAuthenticated,
  onReply,
  onEdit,
  onDelete,
  onHide,
}: CommentItemProps) {
  const indent = Math.max((comment.depth - 1) * 16, 0);
  const [activeMode, setActiveMode] = useState<CommentActionMode>(null);
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isAuthor = Boolean(currentUserId) && currentUserId === comment.authorId;
  const canReply = isAuthenticated && Boolean(onReply) && comment.depth < 3;
  const canEdit = isAuthor && Boolean(onEdit);
  const canDelete = isAuthor && Boolean(onDelete);
  const canHide =
    Boolean(onHide) &&
    (currentUserRole === "staff" || currentUserRole === "admin");

  function openComposer(mode: Exclude<CommentActionMode, null>) {
    setError("");
    setActiveMode(mode);
    setInputValue(mode === "edit" ? comment.content : "");
  }

  function closeComposer() {
    setActiveMode(null);
    setInputValue("");
    setError("");
  }

  async function handleComposerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeMode) {
      return;
    }

    const value = inputValue.trim();
    if (activeMode !== "hide" && !value) {
      setError("Content is required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (activeMode === "reply" && onReply) {
        await onReply(comment._id, value);
      }

      if (activeMode === "edit" && onEdit) {
        await onEdit(comment._id, value);
      }

      if (activeMode === "hide" && onHide) {
        await onHide(comment._id, value || undefined);
      }

      closeComposer();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to submit comment action",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) {
      return;
    }

    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onDelete(comment._id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete this comment",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{ marginLeft: indent }}
      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="flex items-start gap-3">
        {comment.author?.avatarUrl ? (
          <Image
            src={comment.author.avatarUrl}
            alt={comment.author.fullName}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs text-slate-500">
            {getInitials(comment.author?.fullName)}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">
              {comment.author?.fullName ?? "Anonymous"}
            </p>
            {comment.isEdited ? <Badge>edited</Badge> : null}
            {comment.parentId ? <Badge>reply</Badge> : null}
          </div>

          <p className="break-words text-sm leading-6 text-slate-700">
            {comment.content}
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
            <span>{new Date(comment.createdAt).toLocaleString()}</span>
            {canReply ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => openComposer("reply")}
                disabled={submitting}
              >
                Reply
              </Button>
            ) : null}
            {canEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => openComposer("edit")}
                disabled={submitting}
              >
                Edit
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleDelete}
                disabled={submitting}
              >
                Delete
              </Button>
            ) : null}
            {canHide ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => openComposer("hide")}
                disabled={submitting}
              >
                Hide
              </Button>
            ) : null}
          </div>

          {activeMode ? (
            <form
              className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
              onSubmit={handleComposerSubmit}
            >
              <Textarea
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder={
                  activeMode === "reply"
                    ? "Write a reply"
                    : activeMode === "edit"
                      ? "Update your comment"
                      : "Optional moderation reason"
                }
                required={activeMode !== "hide"}
              />

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="xs" disabled={submitting}>
                  {submitting
                    ? "Submitting..."
                    : activeMode === "reply"
                      ? "Post reply"
                      : activeMode === "edit"
                        ? "Save"
                        : "Hide comment"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={closeComposer}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}

          {!activeMode && error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface CommentListProps {
  comments: Comment[];
  currentUserId?: string | null;
  currentUserRole?: Role | null;
  isAuthenticated?: boolean;
  onReply?: (commentId: string, content: string) => Promise<void>;
  onEdit?: (commentId: string, content: string) => Promise<void>;
  onDelete?: (commentId: string) => Promise<void>;
  onHide?: (commentId: string, reason?: string) => Promise<void>;
}

export function CommentList({
  comments,
  currentUserId,
  currentUserRole,
  isAuthenticated = false,
  onReply,
  onEdit,
  onDelete,
  onHide,
}: CommentListProps) {
  if (comments.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        No comments yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <CommentItem
          key={comment._id}
          comment={comment}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          isAuthenticated={isAuthenticated}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onHide={onHide}
        />
      ))}
    </div>
  );
}
