import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getRequestIdentity } from "@/lib/identity";
import { getVendorProfileByUserId } from "@/lib/vendor";

// Vendor dashboard: "received jobs" — orders placed against any of this
// vendor's services, regardless of which buyer placed them.
export async function GET() {
  const identity = await getRequestIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendorProfile = await getVendorProfileByUserId(identity.userId);
  if (!vendorProfile) {
    return NextResponse.json(
      { error: "Vendor profile not found for this account" },
      { status: 404 }
    );
  }

  const receivedOrders = await db.query.orders.findMany({
    where: eq(orders.vendorId, vendorProfile.id),
    orderBy: desc(orders.createdAt),
    with: {
      service: { columns: { title: true } },
      buyer: { columns: { name: true, email: true } },
    },
  });

  return NextResponse.json({ orders: receivedOrders });
}
