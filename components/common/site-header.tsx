"use client";

import { m, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui";
import { getNavbarLinks } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const { user, logout, initializing } = useAuth();
  const links = getNavbarLinks(user?.role);
  const hoverMotion = shouldReduceMotion ? undefined : { y: -1 };
  const tapMotion = shouldReduceMotion ? undefined : { scale: 0.98 };

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.push("/");
    }
  }

  return (
    <m.header
      className="sticky top-0 z-50 w-full overflow-hidden border-b border-cyan-200/70 bg-white/85 text-slate-900 shadow-[0_14px_40px_rgba(14,116,144,0.12)] backdrop-blur-xl"
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0.12 : 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.35),transparent_40%),radial-gradient(circle_at_88%_8%,rgba(254,240,138,0.45),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,249,255,0.94))]" />
      <div className="relative page-shell flex h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500 text-sm font-bold text-white shadow-lg shadow-cyan-500/25">
            WP
          </span>
          <span className="text-sm font-semibold tracking-wide text-slate-900 sm:text-base">
            Web Project
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-2 md:flex">
            {links.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <m.div key={item.href} whileHover={hoverMotion} whileTap={tapMotion}>
                  <Link
                    href={item.href}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "h-9 rounded-lg border border-transparent text-xs uppercase tracking-[0.08em] text-slate-700 hover:border-cyan-300/70 hover:bg-cyan-50 hover:text-slate-900 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                      isActive ? "border-cyan-400/70 bg-cyan-100 text-cyan-800" : "",
                    )}
                  >
                    {item.label}
                  </Link>
                </m.div>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {initializing ? (
              <span className="text-xs text-slate-500">Loading...</span>
            ) : user ? (
              <>
                <m.div whileHover={hoverMotion} whileTap={tapMotion}>
                  <Link
                    href="/dashboard/profile"
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "inline-flex h-9 max-w-40 rounded-lg border border-cyan-200/70 text-sm font-medium text-slate-700 hover:bg-cyan-50 hover:text-slate-900 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                    )}
                  >
                    <span className="truncate">{user.fullName}</span>
                  </Link>
                </m.div>
                <m.div whileHover={hoverMotion} whileTap={tapMotion}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLogout}
                    className="border-cyan-200/80 bg-white text-slate-700 hover:bg-cyan-50 hover:text-slate-900 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    Logout
                  </Button>
                </m.div>
              </>
            ) : (
              <>
                <m.div whileHover={hoverMotion} whileTap={tapMotion}>
                  <Link
                    href="/login"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "border-cyan-200/80 bg-white text-slate-700 hover:bg-cyan-50 hover:text-slate-900 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                    )}
                  >
                    Login
                  </Link>
                </m.div>
                <m.div whileHover={hoverMotion} whileTap={tapMotion}>
                  <Link
                    href="/register"
                    className={cn(
                      buttonVariants({ variant: "default", size: "sm" }),
                      "bg-cyan-500 text-white hover:bg-cyan-400 focus-visible:ring-cyan-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                    )}
                  >
                    Register
                  </Link>
                </m.div>
              </>
            )}
          </div>
        </div>
      </div>
    </m.header>
  );
}
