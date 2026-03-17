"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Badge, Button, buttonVariants } from "@/components/ui";
import { getNavbarLinks } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, initializing } = useAuth();
  const links = getNavbarLinks(user?.role);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.push("/");
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="section-shell flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 text-slate-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 text-sm font-bold text-white">
            WP
          </span>
          <span className="text-sm font-semibold tracking-wide sm:text-base">
            Web Project
          </span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "h-9 rounded-lg text-xs uppercase tracking-[0.08em]",
                pathname.startsWith(item.href) ? "bg-slate-100 text-slate-900" : "",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {initializing ? (
            <span className="text-xs text-slate-500">Loading...</span>
          ) : user ? (
            <>
              <Badge variant="accent" className="hidden sm:inline-flex">
                {user.role}
              </Badge>
              <span className="hidden text-sm text-slate-700 sm:inline-block">
                {user.fullName}
              </span>
              <Button size="sm" variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Login
              </Link>
              <Link
                href="/register"
                className={buttonVariants({ variant: "default", size: "sm" })}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
