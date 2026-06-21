import { headers } from "next/headers";
import { UserRole } from "@/lib/auth";

export interface RequestIdentity {
  userId: string;
  role: UserRole;
  email: string;
}

/**
 * Reads the identity headers set by `middleware.ts` after JWT verification.
 * Returns null if the request reached this route without going through a
 * middleware-protected path (e.g. a public route), meaning there is no
 * verified identity to read.
 */
export async function getRequestIdentity(): Promise<RequestIdentity | null> {
  const h = await headers();
  const userId = h.get("x-user-id");
  const role = h.get("x-user-role") as UserRole | null;
  const email = h.get("x-user-email");

  if (!userId || !role || !email) return null;
  return { userId, role, email };
}
