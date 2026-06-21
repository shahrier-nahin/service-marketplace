import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, vendorProfiles } from "@/db/schema";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

// Unlike the role-protected routes, this endpoint is intentionally NOT
// behind middleware (it's not in the matcher list) — it needs to work for
// both logged-in and logged-out visitors, returning `{ user: null }` rather
// than a 401, so the frontend can use it to silently check session state on
// every page load (e.g. to decide whether to show "Login" or "Dashboard"
// in the nav) without triggering a redirect loop.
export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  if (!payload) {
    return NextResponse.json({ user: null });
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user) {
    // Token was valid but the user no longer exists (e.g. deleted account)
    return NextResponse.json({ user: null });
  }

  let vendorProfileId: string | null = null;
  if (user.role === "VENDOR") {
    const [profile] = await db
      .select({ id: vendorProfiles.id })
      .from(vendorProfiles)
      .where(eq(vendorProfiles.userId, user.id))
      .limit(1);
    vendorProfileId = profile?.id ?? null;
  }

  return NextResponse.json({ user: { ...user, vendorProfileId } });
}
