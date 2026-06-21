import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";

// Admin oversight view: every order in the system, across all vendors and
// buyers, for dispute handling / platform monitoring.
export async function GET() {
  const allOrders = await db.query.orders.findMany({
    orderBy: desc(orders.createdAt),
    with: {
      service: { columns: { title: true } },
      buyer: { columns: { name: true, email: true } },
      vendor: { columns: { businessName: true } },
    },
  });

  return NextResponse.json({ orders: allOrders });
}
