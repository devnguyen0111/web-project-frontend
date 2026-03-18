import type { Role } from "@/lib/types";

export interface NavLink {
  href: string;
  label: string;
}

export function canAccessDashboard(role?: Role | null): boolean {
  return role === "author" || role === "staff" || role === "admin";
}

export function canAccessModeration(role?: Role | null): boolean {
  return role === "staff" || role === "admin";
}

export function getNavbarLinks(role?: Role | null): NavLink[] {
  const links: NavLink[] = [{ href: "/blog", label: "Blog" }];

  if (canAccessDashboard(role)) {
    links.push({ href: "/dashboard", label: "Dashboard" });
  }

  if (role === "staff") {
    links.push({ href: "/staff", label: "Staff" });
  }

  if (role === "admin") {
    links.push({ href: "/admin", label: "Admin" });
  }

  return links;
}
