"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CommentList } from "@/components/blog/CommentList";
import { useParams } from "next/navigation";
import {
  createComment,
  getPollResults,
  getPostBySlug,
  listComments,
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

    if (!getAccessToken()) {
      setError("Please login before voting poll");
      return;
    }

    try {
      await votePoll(post._id, optionIndex);
      const nextPoll = await getPollResults(post._id);
      setPoll(nextPoll);
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

    try {
      await createComment(post._id, commentInput);
      setCommentInput("");
      const next = await listComments(post._id, 1, 50);
      setComments(next.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comment failed");
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (loading) {
    return <main className="mx-auto max-w-4xl px-4 py-8">Loading...</main>;
  }

  if (error && !post) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 text-red-600">{error}</main>
    );
  }

  if (!post) {
    return <main className="mx-auto max-w-4xl px-4 py-8">Post not found</main>;
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <article className="rounded-2xl border border-black/10 bg-white p-6">
        {post.coverImageUrl ? (
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="mb-5 h-64 w-full rounded-xl object-cover"
          />
        ) : null}
        <p className="text-xs uppercase tracking-wide text-cyan-700">
          {post.status}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{post.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Views: {post.views} | Likes: {post.likesCount} | Comments:{" "}
          {post.commentsCount}
        </p>
        <div className="mt-6 whitespace-pre-wrap text-slate-800">
          {post.content}
        </div>
      </article>

      {poll ? (
        <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-900">Poll</h2>
          <p className="mt-2 text-sm text-slate-700">{poll.question}</p>
          <div className="mt-4 space-y-2">
            {poll.options.map((option, index) => (
              <button
                key={`${option.text}-${index}`}
                type="button"
                onClick={() => handleVote(index)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-cyan-500"
              >
                <span>{option.text}</span>
                <span>{option.votes} votes</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Total votes: {poll.totalVotes}
          </p>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Comments</h2>

        <form className="mt-4 space-y-3" onSubmit={handleComment}>
          <textarea
            value={commentInput}
            onChange={(event) => setCommentInput(event.target.value)}
            className="h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
            placeholder="Write your comment"
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Add comment
          </button>
        </form>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-4">
          <CommentList comments={comments} />
        </div>
      </section>
    </main>
  );
}
