import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { getRequestIdentity } from "@/lib/identity";
import { getVendorProfileByUserId } from "@/lib/vendor";
import { updateServiceSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined)
    updates.description = parsed.data.description;
  if (parsed.data.category !== undefined)
    updates.category = parsed.data.category;
  if (parsed.data.price !== undefined)
    updates.price = parsed.data.price.toFixed(2);
  if (parsed.data.imageUrl !== undefined)
    updates.imageUrl = parsed.data.imageUrl || null;
  if (parsed.data.durationMinutes !== undefined)
    updates.durationMinutes = parsed.data.durationMinutes;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  // The WHERE clause includes vendorId, not just service id — this is the
  // actual ownership enforcement. Without the vendorId condition, any
  // authenticated vendor could edit any other vendor's service by guessing
  // its UUID; the role check from the proxy only proves "is a vendor," not
  // "owns this specific resource."
  const [updated] = await db
    .update(services)
    .set(updates)
    .where(and(eq(services.id, id), eq(services.vendorId, vendorProfile.id)))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Service not found or not owned by this vendor" },
      { status: 404 }
    );
  }

  return NextResponse.json({ service: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // Soft-delete via ARCHIVED status rather than a hard DELETE: existing
  // orders reference this service via a foreign key with ON DELETE RESTRICT
  // (see schema.ts), so a hard delete would fail anyway once an order
  // exists for it — and archiving preserves order history correctly, since
  // a buyer's past order should still show what they bought even after a
  // vendor stops offering it.
  const [archived] = await db
    .update(services)
    .set({ status: "ARCHIVED", updatedAt: new Date() })
    .where(and(eq(services.id, id), eq(services.vendorId, vendorProfile.id)))
    .returning();

  if (!archived) {
    return NextResponse.json(
      { error: "Service not found or not owned by this vendor" },
      { status: 404 }
    );
  }

  return NextResponse.json({ service: archived });
}
