import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { orders, services } from "@/db/schema";
import { getRequestIdentity } from "@/lib/identity";
import { createOrderSchema } from "@/lib/validation";

// GET: the current user's own order/booking history (any role can have
// placed orders, including a VENDOR acting as a buyer of someone else's
// service — the brief's "End-User Profile: view personal order history"
// requirement isn't restricted to USER-role accounts specifically).
export async function GET() {
  const identity = await getRequestIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myOrders = await db.query.orders.findMany({
    where: eq(orders.buyerId, identity.userId),
    orderBy: desc(orders.createdAt),
    with: {
      service: { columns: { title: true, category: true } },
      vendor: { columns: { businessName: true } },
    },
  });

  return NextResponse.json({ orders: myOrders });
}

// POST: book a service — the checkout journey. Simulates a payment gateway
// in a sandbox/test mode: no real payment processor is called, but the flow
// (create order -> "process payment" -> mark paid/confirmed) mirrors a real
// integration's shape, so swapping in a real gateway later only touches this
// one function, not the surrounding order/RBAC logic.
export async function POST(request: NextRequest) {
  const identity = await getRequestIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { serviceId } = parsed.data;

  const [service] = await db
    .select()
    .from(services)
    .where(eq(services.id, serviceId))
    .limit(1);

  if (!service || service.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Service not found or no longer available" },
      { status: 404 }
    );
  }

  // Mock payment gateway: deterministically "succeeds" in this sandbox.
  // A real integration would call out to a provider here (e.g. Stripe) and
  // branch on its response; this function is the seam where that would go.
  const mockPaymentReference = `MOCK-${randomUUID()}`;

  const [order] = await db
    .insert(orders)
    .values({
      buyerId: identity.userId,
      serviceId: service.id,
      vendorId: service.vendorId,
      priceAtBooking: service.price,
      status: "CONFIRMED",
      paymentStatus: "PAID",
      mockPaymentReference,
    })
    .returning();

  return NextResponse.json({ order }, { status: 201 });
}
