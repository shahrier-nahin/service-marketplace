import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}
const secretKey = new TextEncoder().encode(JWT_SECRET);

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = "7d";

export type UserRole = "ADMIN" | "VENDOR" | "USER";

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function verifyPassword(
  plainPassword: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

// ---------------------------------------------------------------------------
// JWT signing & verification
//
// We use `jose` rather than the `jsonwebtoken` package specifically because
// `jose` works in the Edge Runtime, which Next.js can use for `proxy.ts`
// (the route-protection layer — see proxy.ts for why), whereas
// `jsonwebtoken` relies on Node's `crypto` module and breaks in that
// runtime. Since route protection happens in `proxy.ts`, this matters for
// the architecture, not just as a library preference.
// ---------------------------------------------------------------------------

export async function signAuthToken(
  payload: AuthTokenPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secretKey);
}

export async function verifyAuthToken(
  token: string
): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (
      typeof payload.userId === "string" &&
      typeof payload.email === "string" &&
      typeof payload.role === "string"
    ) {
      return {
        userId: payload.userId,
        email: payload.email,
        role: payload.role as UserRole,
      };
    }
    return null;
  } catch {
    // Expired, malformed, or tampered token — treat as unauthenticated
    // rather than throwing, so callers can uniformly redirect to login.
    return null;
  }
}

export const AUTH_COOKIE_NAME = "marketplace_token";
