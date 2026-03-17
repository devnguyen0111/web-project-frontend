"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/api/token-store";
import { logout, me } from "@/lib/api/auth";
import type { AuthUser } from "@/lib/types";

export function SiteHeader() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      return;
    }

    me()
      .then((result) => setUser(result))
      .catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Ignore API failures and still clear client-side state.
    }

    setUser(null);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/85 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-slate-900"
        >
          Web Project
        </Link>

        <nav className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <Link
            href="/blog"
            className="rounded-md px-3 py-2 hover:bg-slate-100"
          >
            Blog
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 hover:bg-slate-100"
          >
            Dashboard
          </Link>
          <Link
            href="/admin"
            className="rounded-md px-3 py-2 hover:bg-slate-100"
          >
            Moderation
          </Link>

          {user ? (
            <>
              <span className="rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-900">
                {user.fullName} ({user.role})
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md bg-slate-900 px-3 py-2 text-xs text-white hover:bg-slate-700"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md border border-slate-300 px-3 py-2 text-xs hover:bg-slate-100"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-slate-900 px-3 py-2 text-xs text-white hover:bg-slate-700"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
