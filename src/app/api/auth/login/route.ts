import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, signAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Intentionally identical error message/status for "no such user" and
  // "wrong password" — distinguishing them lets an attacker enumerate
  // which emails are registered.
  const invalidCredentialsResponse = () =>
    NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  if (!user) {
    return invalidCredentialsResponse();
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return invalidCredentialsResponse();
  }

  const token = await signAuthToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const response = NextResponse.json({
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
  });

  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
