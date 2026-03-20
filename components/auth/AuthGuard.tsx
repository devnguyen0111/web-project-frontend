"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { Spinner } from "@/components/ui";
import type { Role } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

interface GuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: GuardProps) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-10">
        {fallback ?? (
          <div className="glass-panel flex items-center gap-3 px-5 py-4 text-sm text-slate-800">
            <Spinner size="sm" />
            Loading session...
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center gap-3 px-4 py-10 text-center">
        <div className="glass-panel max-w-lg space-y-3 px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Protected area
          </p>
          <p className="text-lg font-semibold text-slate-900">
            Access requires authentication.
          </p>
          <p className="text-sm text-slate-600">
            Sign in to continue to this section.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/login"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Sign in
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Browse public site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

interface RoleGuardProps extends GuardProps {
  allowedRoles: Role[];
  enforce?: boolean;
  redirectTo?: string;
}

export function RoleGuard({
  children,
  fallback,
  allowedRoles,
  enforce = true,
  redirectTo,
}: RoleGuardProps) {
  const { user, initializing } = useAuth();
  const router = useRouter();

  const isDenied = !initializing && (!user || !allowedRoles.includes(user.role));

  useEffect(() => {
    if (enforce && isDenied && redirectTo) {
      router.replace(redirectTo);
    }
  }, [enforce, isDenied, redirectTo, router]);

  if (!enforce) {
    return <>{children}</>;
  }

  if (initializing) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-10">
        {fallback ?? (
          <div className="glass-panel flex items-center gap-3 px-5 py-4 text-sm text-slate-800">
            <Spinner size="sm" />
            Verifying permissions...
          </div>
        )}
      </div>
    );
  }

  if (isDenied && redirectTo) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-10">
        {fallback ?? (
          <div className="glass-panel flex items-center gap-3 px-5 py-4 text-sm text-slate-800">
            <Spinner size="sm" />
            Redirecting...
          </div>
        )}
      </div>
    );
  }

  if (isDenied) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center gap-3 px-4 py-10 text-center">
        <div className="glass-panel max-w-lg space-y-3 px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Restricted
          </p>
          <p className="text-lg font-semibold text-slate-900">
            You do not have permission.
          </p>
          <p className="text-sm text-slate-600">
            Reach out to your team to request access if this is an error.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

