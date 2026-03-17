import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
      <section className="rounded-3xl border border-black/10 bg-white/80 p-8 shadow-2xl shadow-cyan-100/40 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-700">
          Full-stack alignment
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
          Frontend now mirrors backend phase 1 and phase 2 APIs.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Built from existing NestJS modules: auth, users, blog posts, comments,
          categories, tags, and moderation.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Login
          </Link>
          <Link
            href="/blog"
            className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            Open blog
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            Open dashboard
          </Link>
          <Link
            href="/admin"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            Open moderation
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-900">
            Implemented in frontend
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Auth flows: register, login, logout, current user</li>
            <li>Blog list with search, category and tag filters</li>
            <li>Post detail, poll vote, comment creation and list</li>
            <li>Dashboard: profile edit and my posts</li>
            <li>Author create post and submit for moderation</li>
            <li>Admin/staff moderation approve and reject queue</li>
          </ul>
        </article>

        <article className="rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-900">
            Progress from project docs
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>
              Done now: auth, users profile, core blog moderation workflow
            </li>
            <li>
              Partially started: public frontend routes and dashboard shell
            </li>
            <li>
              Not started yet: store, wallet, ticket, subscriptions, wiki,
              notifications, review
            </li>
            <li>
              Docs still marked as planning even though backend phase 1-2 is
              implemented
            </li>
          </ul>
        </article>
      </section>
    </main>
  );
}
