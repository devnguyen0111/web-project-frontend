"use client";

import { m, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/common/theme-toggle";
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
      className="sticky top-0 z-40 border-b border-[color:color-mix(in_oklab,var(--border),transparent_15%)] bg-[color:color-mix(in_oklab,var(--background),transparent_18%)] backdrop-blur-xl"
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0.12 : 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="section-shell flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 text-[color:var(--foreground)]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-xs)] bg-[image:var(--gradient-primary)] text-sm font-bold text-white shadow-[var(--shadow-sm)]">
            VP
          </span>
          <span className="text-sm font-semibold tracking-wide sm:text-base">Vua Project</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((item) => (
              <m.div key={item.href} whileHover={hoverMotion} whileTap={tapMotion}>
                <Link
                  href={item.href}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-9 rounded-[var(--radius-xs)] text-xs uppercase tracking-[0.08em]",
                    pathname.startsWith(item.href)
                      ? "border border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--muted),transparent_10%)]"
                      : "",
                  )}
                >
                  {item.label}
                </Link>
              </m.div>
            ))}
          </nav>

          <ThemeToggle />

          {initializing ? (
            <span className="text-xs text-[color:var(--muted-foreground)]">Loading...</span>
          ) : user ? (
            <>
              <m.div whileHover={hoverMotion} whileTap={tapMotion}>
                <Link
                  href="/dashboard/profile"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "inline-flex h-9 max-w-40 rounded-[var(--radius-xs)] text-sm font-medium",
                  )}
                >
                  <span className="truncate">{user.fullName}</span>
                </Link>
              </m.div>
              <m.div whileHover={hoverMotion} whileTap={tapMotion}>
                <Button size="sm" variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </m.div>
            </>
          ) : (
            <>
              <m.div whileHover={hoverMotion} whileTap={tapMotion}>
                <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  Login
                </Link>
              </m.div>
              <m.div whileHover={hoverMotion} whileTap={tapMotion}>
                <Link href="/register" className={buttonVariants({ variant: "default", size: "sm" })}>
                  Register
                </Link>
              </m.div>
            </>
          )}
        </div>
      </div>
    </m.header>
  );
}
