import Image from "next/image";
import { Badge } from "@/components/ui";
import type { Comment } from "@/lib/types";

interface CommentItemProps {
  comment: Comment;
}

function CommentItem({ comment }: CommentItemProps) {
  const indent = Math.max((comment.depth - 1) * 16, 0);

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
            AN
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">
              {comment.author?.fullName ?? "Anonymous"}
            </p>
            {comment.isEdited ? <Badge>edited</Badge> : null}
          </div>
          <p className="break-words text-sm text-slate-700">{comment.content}</p>
          <p className="text-xs text-slate-500">
            {new Date(comment.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

interface CommentListProps {
  comments: Comment[];
}

export function CommentList({ comments }: CommentListProps) {
  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <CommentItem key={comment._id} comment={comment} />
      ))}
    </div>
  );
}
