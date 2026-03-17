"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CommentList } from "@/components/blog/CommentList";
import { PostBlockRenderer } from "@/components/blog/PostBlockRenderer";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner, Textarea } from "@/components/ui";
import {
  createComment,
  getPostLikeStatus,
  getPollResults,
  getPostBySlug,
  listComments,
  togglePostLike,
  votePoll,
} from "@/lib/api/blog";
import { getAccessToken } from "@/lib/api/token-store";
import type { Comment, Poll, Post } from "@/lib/types";

export default function BlogDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = useMemo(() => params?.slug ?? "", [params]);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [liking, setLiking] = useState(false);
  const pollEndsAtMs = poll?.endsAt ? new Date(poll.endsAt).getTime() : null;
  const isPollEnded =
    pollEndsAtMs !== null && !Number.isNaN(pollEndsAtMs) && pollEndsAtMs <= Date.now();
  const isPollPermanent = poll ? (poll.isPermanent ?? !poll.endsAt) : false;

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
        listComments(postData._id, 1, 50),
        postData.poll ? getPollResults(postData._id) : Promise.resolve(null),
      ]);

      setComments(commentsData.data);
      setPoll(pollData);

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

    if (!getAccessToken()) {
      setError("Please login before commenting");
      return;
    }

    setSubmittingComment(true);
    try {
      await createComment(post._id, commentInput);
      setCommentInput("");
      const next = await listComments(post._id, 1, 50);
      setComments(next.data);
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

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

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
      <section className="section-shell space-y-6">
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
              <Button
                type="button"
                variant={liked ? "secondary" : "outline"}
                size="sm"
                onClick={handleToggleLike}
                disabled={liking}
              >
                {liking ? "Updating..." : liked ? "Liked" : "Like"} ({post.likesCount})
              </Button>
            </div>
            <CardTitle className="text-2xl md:text-3xl">{post.title}</CardTitle>
            <CardDescription>
              By {post.author?.fullName ?? post.authorId} | {post.views} views | {post.likesCount} likes |{" "}
              {post.commentsCount} comments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PostBlockRenderer blocks={post.blocks ?? []} />
          </CardContent>
        </Card>

        {poll ? (
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
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comments</CardTitle>
            <CardDescription>{comments.length} comments</CardDescription>
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
            <CommentList comments={comments} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
