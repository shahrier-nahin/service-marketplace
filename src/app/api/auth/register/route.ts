import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, vendorProfiles } from "@/db/schema";
import { hashPassword, signAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, password, role, businessName } = parsed.data;

  if (role === "VENDOR" && !businessName) {
    return NextResponse.json(
      { error: "businessName is required when registering as a vendor" },
      { status: 400 }
    );
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  // Wrap user + vendor-profile creation in a transaction: if vendor profile
  // creation fails, we must not be left with an orphaned VENDOR-role user
  // that has no vendor_profiles row (which would break the vendor dashboard).
  const newUser = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ name, email, passwordHash, role })
      .returning({ id: users.id, email: users.email, role: users.role });

    if (role === "VENDOR" && businessName) {
      await tx.insert(vendorProfiles).values({
        userId: user.id,
        businessName,
      });
    }

    return user;
  });

  const token = await signAuthToken({
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
  });

  const response = NextResponse.json(
    { user: { id: newUser.id, email: newUser.email, role: newUser.role } },
    { status: 201 }
  );

  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days, matching token expiry
  });

  return response;
}
