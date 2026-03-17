import Image from "next/image";
import type { Comment } from "@/lib/types";

interface CommentItemProps {
  comment: Comment;
}

export function CommentItem({ comment }: CommentItemProps) {
  return (
    <div
      style={{ marginLeft: (comment.depth - 1) * 24, marginTop: 12 }}
      className="flex gap-2 items-start"
    >
      {comment.author?.avatarUrl ? (
        <Image
          src={comment.author.avatarUrl}
          alt={comment.author.fullName}
          width={32}
          height={32}
          className="rounded-full object-cover"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-300" />
      )}
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {comment.author?.fullName || "[Ẩn danh]"}
          </span>
          {comment.isEdited && (
            <span className="text-xs text-gray-400">(đã sửa)</span>
          )}
        </div>
        <div className="text-sm mt-1">{comment.content}</div>
        <div className="text-xs text-gray-400 mt-1">
          {new Date(comment.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

interface CommentListProps {
  comments: Comment[];
}

export function CommentList({ comments }: CommentListProps) {
  // Hiển thị dạng phẳng, lồng nhau bằng margin theo depth
  return (
    <div>
      {comments.map((c) => (
        <CommentItem key={c._id} comment={c} />
      ))}
    </div>
  );
}
