import type { Role } from "@/lib/types";

export interface NavLink {
  href: string;
  label: string;
}

export interface HeaderNavChildItem {
  href: string;
  label: string;
  description?: string;
}

export interface HeaderNavItem {
  href?: string;
  label: string;
  children?: HeaderNavChildItem[];
}

export interface HeaderCreateAction {
  href: string;
  label: string;
}

export interface HeaderNavModel {
  desktopItems: HeaderNavItem[];
  createActions: HeaderCreateAction[];
}

export interface RoleBadgeVariant {
  label: string;
  className: string;
}

export function canAccessDashboard(role?: Role | null): boolean {
  return role === "author" || role === "staff" || role === "admin";
}

export function canAccessModeration(role?: Role | null): boolean {
  return role === "staff" || role === "admin";
}

export function getRoleDashboardHref(role?: Role | null): string {
  if (role === "admin") {
    return "/admin";
  }
  if (role === "staff") {
    return "/staff";
  }
  return "/dashboard";
}

export function getRoleBadgeVariant(role?: Role | null): RoleBadgeVariant {
  if (role === "author") {
    return {
      label: "Author",
      className: "border border-sky-200 bg-sky-100 text-sky-700",
    };
  }

  if (role === "staff") {
    return {
      label: "Staff",
      className: "border border-violet-200 bg-violet-100 text-violet-700",
    };
  }

  if (role === "admin") {
    return {
      label: "Admin",
      className: "border border-orange-200 bg-orange-100 text-orange-700",
    };
  }

  return {
    label: "Guest",
    className: "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]",
  };
}

export function getHeaderNavModel(role?: Role | null): HeaderNavModel {
  const isAuthenticated = role === "author" || role === "staff" || role === "admin";
  const desktopItems: HeaderNavItem[] = isAuthenticated
    ? [
        { href: "/blog", label: "Blog" },
        { href: "/store", label: "Store" },
        { href: getRoleDashboardHref(role), label: "Dashboard" },
        { href: "/tickets", label: "Tickets" },
        { href: "/subscription", label: "Subscription" },
        { href: "/dashboard/wallet", label: "Wallet" },
      ]
    : [
        {
          label: "Blog",
          children: [
            {
              href: "/blog",
              label: "All Posts",
              description: "Latest published posts from the community.",
            },
            {
              href: "/blog#filters",
              label: "Categories",
              description: "Browse posts by category and tag filters.",
            },
            {
              href: "/leaderboard",
              label: "Leaderboard",
              description: "See top authors and community rankings.",
            },
          ],
        },
        { href: "/store", label: "Store" },
        { href: "/subscription", label: "Subscription (VIP)" },
        { href: "/knowledge", label: "Wiki" },
        { href: "/leaderboard", label: "Leaderboard" },
      ];

  const createActions: HeaderCreateAction[] = [];
  if (isAuthenticated) {
    createActions.push({ href: "/dashboard/posts/new", label: "Write New Post" });
    createActions.push({ href: "/tickets", label: "Create Support Ticket" });
  }

  if (role === "staff" || role === "admin") {
    createActions.push({ href: "/staff/store/products", label: "Add Product" });
    createActions.push({
      href: "/staff/store/products?type=custom_order",
      label: "Publish Custom Order Product",
    });
  }

  return {
    desktopItems,
    createActions,
  };
}

export function getNavbarLinks(role?: Role | null): NavLink[] {
  const links: NavLink[] = [
    { href: "/blog", label: "Blog" },
    { href: "/store", label: "Store" },
    { href: "/subscription", label: "Subscription" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/badges", label: "Badges" },
  ];

  if (role === "author" || role === "staff" || role === "admin") {
    links.push({ href: "/cart", label: "Cart" });
  }

  if (canAccessDashboard(role)) {
    links.push({ href: "/dashboard", label: "Dashboard" });
    links.push({ href: "/dashboard/orders", label: "Orders" });
    links.push({ href: "/tickets", label: "Tickets" });
    links.push({ href: "/notifications", label: "Alerts" });
  }

  if (role === "staff" || role === "admin") {
    links.push({ href: "/staff/store/orders", label: "Store Ops" });
  }

  if (role === "staff") {
    links.push({ href: "/staff", label: "Staff" });
  }

  if (role === "admin") {
    links.push({ href: "/admin", label: "Admin" });
  }

  return links;
}
