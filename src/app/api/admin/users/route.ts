import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// Reached only after the proxy confirms ADMIN role (path is under
// /api/admin/*). No further per-row ownership check is needed here, since
// an admin is, by definition, authorized to see all users.
export async function GET() {
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return NextResponse.json({ users: allUsers });
}
