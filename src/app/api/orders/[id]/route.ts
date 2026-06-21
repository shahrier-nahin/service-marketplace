import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getRequestIdentity } from "@/lib/identity";
import { getVendorProfileByUserId } from "@/lib/vendor";
import { updateOrderStatusSchema } from "@/lib/validation";

// Only the vendor who received the job can update its status (e.g. mark a
// job COMPLETED). The buyer can view their order but should not be able to
// mark their own job as completed — that's the vendor confirming the work
// was done. This route lives under the proxy's `/api/vendor/*`... actually
// it's under `/api/orders/*`, so we still re-check role + ownership here
// explicitly, since the proxy's matcher for this path only requires *some*
// authenticated user (see proxy.ts AUTH_REQUIRED_PREFIXES), not a vendor.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const identity = await getRequestIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (identity.role !== "VENDOR" && identity.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only vendors can update order status" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (identity.role === "ADMIN") {
    // Admins can override any order's status for oversight/dispute handling.
    const [updated] = await db
      .update(orders)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ order: updated });
  }

  const vendorProfile = await getVendorProfileByUserId(identity.userId);
  if (!vendorProfile) {
    return NextResponse.json(
      { error: "Vendor profile not found for this account" },
      { status: 404 }
    );
  }

  // As with service ownership, the WHERE clause enforces that this vendor
  // can only update orders tied to their own vendorId — not any order ID.
  const [updated] = await db
    .update(orders)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(and(eq(orders.id, id), eq(orders.vendorId, vendorProfile.id)))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Order not found or not associated with this vendor" },
      { status: 404 }
    );
  }

  return NextResponse.json({ order: updated });
}
