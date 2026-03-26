"use client";

import Image from "next/image";
import Link from "next/link";
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
  toggleCommentLike,
  togglePostBookmark,
  togglePostLike,
  updateComment,
  votePoll,
} from "@/lib/api/blog";
import { getAccessToken } from "@/lib/api/token-store";
import { useAuth } from "@/providers/auth-provider";
import type { BlogPostDetailV2, Comment, Poll } from "@/lib/types";

const smoothEase = [0.22, 1, 0.36, 1] as const;
const COMMENTS_PAGE_SIZE = 50;
const VIP_UPGRADE_TITLE = "\u004e\u00e2ng c\u1ea5p VIP \u0111\u1ec3 xem ti\u1ebfp";
const VIP_UPGRADE_DESCRIPTION =
  "N\u1ed9i dung n\u00e0y d\u00e0nh cho th\u00e0nh vi\u00ean VIP \u0111ang ho\u1ea1t \u0111\u1ed9ng.";
const VIP_UPGRADE_LABEL = "N\u00e2ng c\u1ea5p VIP";

export default function BlogDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = useMemo(() => params?.slug ?? "", [params]);
  const { user } = useAuth();

  const [post, setPost] = useState<BlogPostDetailV2 | null>(null);
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
  const [activeHeadingId, setActiveHeadingId] = useState<string>("");

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
            metrics: {
              ...prev.metrics,
              commentsCount: next.total,
            },
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
        listComments(postData.id, {
          page: 1,
          limit: COMMENTS_PAGE_SIZE,
        }),
        postData.poll ? getPollResults(postData.id) : Promise.resolve(null),
      ]);

      setComments(commentsData.data);
      setCommentsTotal(commentsData.total);
      setPoll(pollData);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              metrics: {
                ...prev.metrics,
                commentsCount: commentsData.total,
              },
            }
          : prev,
      );

      if (getAccessToken()) {
        try {
          const likeStatus = await getPostLikeStatus(postData.id);
          setLiked(likeStatus.liked);
          setPost((prev) =>
            prev
              ? {
                  ...prev,
                  metrics: {
                    ...prev.metrics,
                    likesCount: likeStatus.likesCount,
                  },
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

    await createComment(post.id, content, commentId);
    await refreshComments(post.id);
  }

  async function handleEditComment(commentId: string, content: string) {
    if (!post) {
      return;
    }

    if (!getAccessToken()) {
      throw new Error("Please login before editing");
    }

    await updateComment(commentId, content);
    await refreshComments(post.id);
  }

  async function handleDeleteComment(commentId: string) {
    if (!post) {
      return;
    }

    if (!getAccessToken()) {
      throw new Error("Please login before deleting");
    }

    await deleteComment(commentId);
    await refreshComments(post.id);
  }

  async function handleHideComment(commentId: string, reason?: string) {
    if (!post) {
      return;
    }

    if (!getAccessToken()) {
      throw new Error("Please login before moderating");
    }

    await hideComment(commentId, reason);
    await refreshComments(post.id);
  }

  async function handleLikeComment(commentId: string) {
    if (!post) {
      throw new Error("Post missing");
    }

    if (!getAccessToken()) {
      throw new Error("Please login before liking comments");
    }

    const next = await toggleCommentLike(commentId);
    void refreshComments(post.id);
    return next;
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
      await votePoll(post.id, optionIndex);
      const updatedPoll = await getPollResults(post.id);
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
      await createComment(post.id, nextContent);
      setCommentInput("");
      await refreshComments(post.id);
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
      const next = await togglePostLike(post.id);
      setLiked(next.liked);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              metrics: {
                ...prev.metrics,
                likesCount: next.likesCount,
              },
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
      const next = await togglePostBookmark(post.id);
      setBookmarked(next.bookmarked);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              metrics: {
                ...prev.metrics,
                bookmarksCount: Math.max(
                  prev.metrics.bookmarksCount + (next.bookmarked ? 1 : -1),
                  0,
                ),
              },
            }
          : prev,
      );
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
    if (!post?.toc.length) {
      setActiveHeadingId("");
      return;
    }

    const headingElements = post.toc
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => Boolean(node));

    if (headingElements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveHeadingId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-20% 0px -65% 0px",
        threshold: [0.1, 0.4, 0.75],
      },
    );

    headingElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [post?.toc]);

  useEffect(() => {
    if (!post) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshComments(post.id).catch(() => undefined);
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [post?.id]);

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

  const renderedBlocks = post.access.locked
    ? [{ type: "paragraph" as const, text: post.excerpt || VIP_UPGRADE_DESCRIPTION }]
    : (post.blocks ?? []);

  return (
    <main className="pb-14 pt-10">
      <MotionSection
        className="section-shell space-y-6"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: smoothEase }}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-6">
            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.04, ease: smoothEase }}
            >
              <Card className="overflow-hidden">
                {post.coverImageUrl ? (
                  <div className="relative aspect-video w-full">
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
                    <div className="flex flex-wrap items-center gap-2">
                      {post.flags.isExclusive ? (
                        <Badge className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">VIP Only</Badge>
                      ) : null}
                      {post.flags.isFeatured ? <Badge className="bg-amber-100 text-amber-800">Featured</Badge> : null}
                      {post.flags.isPinned ? <Badge className="bg-sky-100 text-sky-800">Pinned</Badge> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant={liked ? "secondary" : "outline"}
                        size="sm"
                        onClick={handleToggleLike}
                        disabled={liking}
                      >
                        {liking ? "Updating..." : liked ? "Liked" : "Like"} ({post.metrics.likesCount})
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
                        ({post.metrics.bookmarksCount})
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-2xl md:text-4xl">{post.title}</CardTitle>
                  <CardDescription>
                    By {post.author.fullName} (Lv {post.author.level ?? 1}) | {post.metrics.views} views |{" "}
                    {post.metrics.readTimeMinutes} min read | {commentsTotal} comments
                    {typeof post.metrics.rewardCoins === "number" ? ` | Reward ${post.metrics.rewardCoins} coins` : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className={post.access.locked ? "pointer-events-none select-none blur-sm" : ""}>
                      <PostBlockRenderer blocks={renderedBlocks} />
                    </div>

                    {post.access.locked ? (
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div className="max-w-sm rounded-[var(--radius-xl)] border border-violet-200 bg-white/95 p-5 text-center shadow-[var(--shadow-md)] backdrop-blur">
                          <p className="text-lg font-semibold text-violet-900">{VIP_UPGRADE_TITLE}</p>
                          <p className="mt-2 text-sm text-violet-700">{VIP_UPGRADE_DESCRIPTION}</p>
                          <Link href={post.access.upgradeUrl} className="mt-4 inline-flex">
                            <Button
                              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700"
                              aria-label={VIP_UPGRADE_LABEL}
                            >
                              {VIP_UPGRADE_LABEL}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </div>
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
                      <Button
                        key={`${option.text}-${index}`}
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => handleVote(index)}
                        disabled={isPollEnded}
                      >
                        <span>{option.text}</span>
                        <span className="text-xs text-slate-500">{option.votes} votes</span>
                      </Button>
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
                      placeholder="Write your comment (supports **bold**, *italic*, `code`, [link](url), list, quote)"
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
                    onLike={handleLikeComment}
                  />
                </CardContent>
              </Card>
            </MotionDiv>
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-[92px] rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Table of Contents
              </p>
              <div className="mt-3 space-y-1">
                {post.toc.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No headings found.</p>
                ) : (
                  post.toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      aria-label={`Jump to ${item.text}`}
                      className={`block rounded-md px-2 py-1 text-sm transition ${
                        activeHeadingId === item.id
                          ? "bg-[var(--primary-soft)] font-semibold text-[var(--primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                      }`}
                      style={{ paddingLeft: `${item.level * 10}px` }}
                    >
                      {item.text}
                    </a>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </MotionSection>
    </main>
  );
}

