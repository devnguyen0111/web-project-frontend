"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/staff/store/dashboard", label: "Dashboard" },
  { href: "/staff/store/orders", label: "Orders" },
  { href: "/staff/store/products", label: "Products" },
  { href: "/staff/store/reviews", label: "Reviews" },
];

export function StaffStoreNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border px-4 text-sm font-semibold transition",
              active
                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
