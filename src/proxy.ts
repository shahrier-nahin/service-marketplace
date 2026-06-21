import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken, AUTH_COOKIE_NAME, UserRole } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Route protection architecture
//
// NOTE on naming: Next.js 16 renamed `middleware.ts` -> `proxy.ts` (and the
// exported function `middleware` -> `proxy`) to clarify that this layer is a
// network-edge proxy, not Express-style application middleware, and to
// discourage treating it as the sole security boundary (this rename
// followed real CVEs where `middleware.ts` was trusted too heavily as an
// auth gate). We follow the current convention here, and additionally
// re-verify ownership at the row level inside individual API route
// handlers (e.g. "does this service actually belong to this vendor") —
// the proxy only establishes "is this request authenticated, with this
// role," not row-level authorization.
//
// This proxy runs on every matched request, BEFORE any page or API route
// handler executes. It is the first checkpoint for "is this request allowed
// to reach this route at all" — individual pages/handlers do not need to
// re-implement basic role checks, though API routes still re-verify
// row-level ownership themselves.
//
// Why a proxy/edge layer at all (rather than only client-side checks or only
// per-page server checks): client-side route guards can be bypassed by
// directly calling the API or disabling JS; per-page checks are easy to
// forget to add to a new page. A single matcher list is harder to
// accidentally leave a route unprotected — but it is deliberately treated
// as a first line of defense, not the only one.
// ---------------------------------------------------------------------------

const ROLE_PROTECTED_PREFIXES: { prefix: string; roles: UserRole[] }[] = [
  { prefix: "/dashboard/admin", roles: ["ADMIN"] },
  { prefix: "/dashboard/vendor", roles: ["VENDOR"] },
  { prefix: "/dashboard/user", roles: ["USER", "VENDOR", "ADMIN"] }, // any logged-in user
  { prefix: "/api/admin", roles: ["ADMIN"] },
  { prefix: "/api/vendor", roles: ["VENDOR"] },
];

// Routes that require *some* authenticated user, regardless of role, beyond
// the role-specific prefixes above (e.g. checkout requires login but any role).
const AUTH_REQUIRED_PREFIXES = ["/checkout", "/api/orders"];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const roleRule = ROLE_PROTECTED_PREFIXES.find((rule) =>
    matchesPrefix(pathname, rule.prefix)
  );
  const requiresAuthOnly =
    !roleRule &&
    AUTH_REQUIRED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));

  if (!roleRule && !requiresAuthOnly) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  const isApiRoute = pathname.startsWith("/api/");

  if (!payload) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (roleRule && !roleRule.roles.includes(payload.role)) {
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Forbidden: insufficient role" },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // Forward the verified identity to downstream Server Components / Route
  // Handlers via request headers, so they don't need to re-verify the JWT
  // themselves for basic identity — only for row-level ownership checks.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-role", payload.role);
  requestHeaders.set("x-user-email", payload.email);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/checkout/:path*",
    "/api/admin/:path*",
    "/api/vendor/:path*",
    "/api/orders/:path*",
  ],
};
