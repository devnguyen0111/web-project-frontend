"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CommentList } from "@/components/blog/CommentList";
import { PostBlockRenderer } from "@/components/blog/PostBlockRenderer";
import { MotionDiv, MotionSection } from "@/components/motion";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner, Textarea } from "@/components/ui";
import {
  createComment,
  deleteComment,
  getPostLikeStatus,
  getPollResults,
  getPostBySlug,
  hideComment,
  listComments,
  togglePostBookmark,
  togglePostLike,
  updateComment,
  votePoll,
} from "@/lib/api/blog";
import { getAccessToken } from "@/lib/api/token-store";
import { useAuth } from "@/providers/auth-provider";
import type { Comment, Poll, Post } from "@/lib/types";

const smoothEase = [0.22, 1, 0.36, 1] as const;
const COMMENTS_PAGE_SIZE = 50;

export default function BlogDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = useMemo(() => params?.slug ?? "", [params]);
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [liking, setLiking] = useState(false);
  const [bookmarked, setBookmarked] = useState<boolean | null>(null);
  const [bookmarking, setBookmarking] = useState(false);
  const pollEndsAtMs = poll?.endsAt ? new Date(poll.endsAt).getTime() : null;
  const isPollEnded =
    pollEndsAtMs !== null && !Number.isNaN(pollEndsAtMs) && pollEndsAtMs <= Date.now();
  const isPollPermanent = poll ? (poll.isPermanent ?? !poll.endsAt) : false;

  async function refreshComments(postId: string) {
    const next = await listComments(postId, {
      page: 1,
      limit: COMMENTS_PAGE_SIZE,
    });

    setComments(next.data);
    setCommentsTotal(next.total);
    setPost((prev) =>
      prev
        ? {
            ...prev,
            commentsCount: next.total,
          }
        : prev,
    );

    return next;
  }

  async function loadAll() {
    if (!slug) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const postData = await getPostBySlug(slug);
      setPost(postData);

      const [commentsData, pollData] = await Promise.all([
        listComments(postData._id, {
          page: 1,
          limit: COMMENTS_PAGE_SIZE,
        }),
        postData.poll ? getPollResults(postData._id) : Promise.resolve(null),
      ]);

      setComments(commentsData.data);
      setCommentsTotal(commentsData.total);
      setPoll(pollData);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              commentsCount: commentsData.total,
            }
          : prev,
      );

      if (getAccessToken()) {
        try {
          const likeStatus = await getPostLikeStatus(postData._id);
          setLiked(likeStatus.liked);
          setPost((prev) =>
            prev
              ? {
                  ...prev,
                  likesCount: likeStatus.likesCount,
                }
              : prev,
          );
        } catch {
          setLiked(null);
        }
      } else {
        setLiked(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load post");
    } finally {
      setLoading(false);
    }
  }

  async function handleReply(commentId: string, content: string) {
    if (!post) {
      return;
    }

    if (!getAccessToken()) {
      throw new Error("Please login before replying");
    }

    await createComment(post._id, content, commentId);
    await refreshComments(post._id);
  }

  async function handleEditComment(commentId: string, content: string) {
    if (!post) {
      return;
    }

    if (!getAccessToken()) {
      throw new Error("Please login before editing");
    }

    await updateComment(commentId, content);
    await refreshComments(post._id);
  }

  async function handleDeleteComment(commentId: string) {
    if (!post) {
      return;
    }

    if (!getAccessToken()) {
      throw new Error("Please login before deleting");
    }

    await deleteComment(commentId);
    await refreshComments(post._id);
  }

  async function handleHideComment(commentId: string, reason?: string) {
    if (!post) {
      return;
    }

    if (!getAccessToken()) {
      throw new Error("Please login before moderating");
    }

    await hideComment(commentId, reason);
    await refreshComments(post._id);
  }

  async function handleVote(optionIndex: number) {
    if (!post) {
      return;
    }

    if (isPollEnded) {
      setError("This poll has ended");
      return;
    }

    if (!getAccessToken()) {
      setError("Please login before voting");
      return;
    }

    try {
      await votePoll(post._id, optionIndex);
      const updatedPoll = await getPollResults(post._id);
      setPoll(updatedPoll);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote failed");
    }
  }

  async function handleComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!post) {
      return;
    }

    const nextContent = commentInput.trim();
    if (!nextContent) {
      setError("Comment content is required");
      return;
    }

    if (!getAccessToken()) {
      setError("Please login before commenting");
      return;
    }

    setSubmittingComment(true);
    setError("");
    try {
      await createComment(post._id, nextContent);
      setCommentInput("");
      await refreshComments(post._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comment failed");
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleToggleLike() {
    if (!post) {
      return;
    }

    if (!getAccessToken()) {
      setError("Please login before liking");
      return;
    }

    setLiking(true);
    setError("");

    try {
      const next = await togglePostLike(post._id);
      setLiked(next.liked);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              likesCount: next.likesCount,
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Like action failed");
    } finally {
      setLiking(false);
    }
  }

  async function handleToggleBookmark() {
    if (!post) {
      return;
    }

    if (!getAccessToken()) {
      setError("Please login before bookmarking");
      return;
    }

    setBookmarking(true);
    setError("");

    try {
      const next = await togglePostBookmark(post._id);
      setBookmarked(next.bookmarked);
      setPost((prev) => {
        if (!prev) {
          return prev;
        }

        const currentBookmarks = prev.bookmarks ?? [];
        const nextBookmarks = user?.id
          ? next.bookmarked
            ? [...new Set([...currentBookmarks, user.id])]
            : currentBookmarks.filter(
                (bookmarkUserId) => String(bookmarkUserId) !== user.id,
              )
          : currentBookmarks;

        return {
          ...prev,
          bookmarks: nextBookmarks,
          bookmarksCount: Math.max(
            prev.bookmarksCount + (next.bookmarked ? 1 : -1),
            0,
          ),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bookmark action failed");
    } finally {
      setBookmarking(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!post || !user?.id) {
      setBookmarked(null);
      return;
    }

    const nextBookmarked = (post.bookmarks ?? []).some(
      (bookmarkUserId) => String(bookmarkUserId) === user.id,
    );
    setBookmarked(nextBookmarked);
  }, [post, user?.id]);

  if (loading) {
    return (
      <main className="section-shell flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
        <Spinner label="Loading post" />
      </main>
    );
  }

  if (error && !post) {
    return (
      <main className="section-shell py-10">
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
        </Card>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="section-shell py-10">
        <Card>
          <CardContent className="p-4 text-sm text-slate-600">Post not found</CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="pb-14 pt-10">
      <MotionSection
        className="section-shell space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: smoothEase }}
      >
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.04, ease: smoothEase }}
        >
          <Card className="overflow-hidden">
            {post.coverImageUrl ? (
              <div className="relative h-72 w-full">
                <Image
                  src={post.coverImageUrl}
                  alt={post.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 900px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge className="w-fit">{post.status}</Badge>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={liked ? "secondary" : "outline"}
                    size="sm"
                    onClick={handleToggleLike}
                    disabled={liking}
                  >
                    {liking ? "Updating..." : liked ? "Liked" : "Like"} ({post.likesCount})
                  </Button>
                  <Button
                    type="button"
                    variant={bookmarked ? "secondary" : "outline"}
                    size="sm"
                    onClick={handleToggleBookmark}
                    disabled={bookmarking}
                  >
                    {bookmarking
                      ? "Updating..."
                      : bookmarked
                        ? "Bookmarked"
                        : "Bookmark"}{" "}
                    ({post.bookmarksCount})
                  </Button>
                </div>
              </div>
              <CardTitle className="text-2xl md:text-3xl">{post.title}</CardTitle>
              <CardDescription>
                By {post.author?.fullName ?? post.authorId} | {post.views} views | {post.likesCount} likes |{" "}
                {commentsTotal} comments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PostBlockRenderer blocks={post.blocks ?? []} />
            </CardContent>
          </Card>
        </MotionDiv>

        {poll ? (
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3, ease: smoothEase }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Poll</CardTitle>
                <CardDescription>{poll.question}</CardDescription>
                <p className="text-xs text-slate-500">
                  {isPollPermanent
                    ? "Permanent poll"
                    : poll?.endsAt
                      ? `Ends at ${new Date(poll.endsAt).toLocaleString()}`
                      : "Poll schedule not set"}
                </p>
                {isPollEnded ? (
                  <p className="text-xs font-semibold text-amber-700">Poll closed</p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-2">
                {poll.options.map((option, index) => (
                  <MotionDiv
                    key={`${option.text}-${index}`}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.24, delay: index * 0.05, ease: smoothEase }}
                  >
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => handleVote(index)}
                      disabled={isPollEnded}
                    >
                      <span>{option.text}</span>
                      <span className="text-xs text-slate-500">{option.votes} votes</span>
                    </Button>
                  </MotionDiv>
                ))}
                <p className="text-xs text-slate-500">Total votes: {poll.totalVotes}</p>
              </CardContent>
            </Card>
          </MotionDiv>
        ) : null}

        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.3, ease: smoothEase }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comments</CardTitle>
              <CardDescription>{commentsTotal} comments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-3" onSubmit={handleComment}>
                <Textarea
                  value={commentInput}
                  onChange={(event) => setCommentInput(event.target.value)}
                  placeholder="Write your comment"
                  required
                />
                <Button type="submit" disabled={submittingComment}>
                  {submittingComment ? "Posting..." : "Add comment"}
                </Button>
              </form>

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <CommentList
                comments={comments}
                currentUserId={user?.id}
                currentUserRole={user?.role}
                isAuthenticated={Boolean(user)}
                onReply={handleReply}
                onEdit={handleEditComment}
                onDelete={handleDeleteComment}
                onHide={handleHideComment}
              />
            </CardContent>
          </Card>
        </MotionDiv>
      </MotionSection>
    </main>
  );
}
