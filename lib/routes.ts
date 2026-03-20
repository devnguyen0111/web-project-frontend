export function resolveLegacyPathname(pathname: string): string | null {
  if (pathname.startsWith("/auth/")) {
    return pathname.replace("/auth", "") || "/";
  }

  if (pathname === "/main/blog") {
    return "/blog";
  }

  if (pathname.startsWith("/main/blog/")) {
    return pathname.replace("/main/blog", "/blog");
  }

  if (pathname === "/main/subscription") {
    return "/subscription";
  }

  if (pathname === "/main/subscriptions") {
    return "/subscriptions";
  }

  if (pathname === "/dashboard/dashboard/subscription") {
    return "/settings/subscription";
  }

  if (pathname === "/dashboard/settings/subscription") {
    return "/settings/subscription";
  }

  if (pathname === "/dashboard/staff" || pathname.startsWith("/dashboard/staff/")) {
    return pathname.replace("/dashboard/staff", "/staff");
  }

  if (pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/")) {
    return pathname.replace("/dashboard/admin", "/admin");
  }

  if (pathname === "/dashboard/dashboard" || pathname.startsWith("/dashboard/dashboard/")) {
    return pathname.replace("/dashboard/dashboard", "/dashboard");
  }

  return null;
}
