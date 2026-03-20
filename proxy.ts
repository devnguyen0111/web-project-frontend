import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveLegacyPathname } from "@/lib/routes";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const redirectedPathname = resolveLegacyPathname(pathname);
  if (!redirectedPathname || redirectedPathname === pathname) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = redirectedPathname;
  url.search = search;

  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/main/:path*",
    "/dashboard/dashboard/:path*",
    "/dashboard/settings/subscription",
    "/dashboard/staff/:path*",
    "/dashboard/admin/:path*",
    "/dashboard/staff",
    "/dashboard/admin",
  ],
};
