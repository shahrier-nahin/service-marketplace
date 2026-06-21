import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { getRequestIdentity } from "@/lib/identity";
import { getVendorProfileByUserId } from "@/lib/vendor";
import { createServiceSchema } from "@/lib/validation";

// Both handlers below are reached only after `proxy.ts` has already
// confirmed the request carries a valid VENDOR-role JWT (this path is under
// the `/api/vendor/*` matcher). We still re-fetch the vendor's own profile
// row here rather than trusting the JWT's role claim alone, since the JWT
// only proves "this user is a vendor," not "here is their vendor_profiles
// row" — and every service must be scoped to that specific row.

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

  const myServices = await db
    .select()
    .from(services)
    .where(eq(services.vendorId, vendorProfile.id))
    .orderBy(desc(services.createdAt));

  return NextResponse.json({ services: myServices });
}

export async function POST(request: NextRequest) {
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

  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, description, category, price, imageUrl, durationMinutes } = parsed.data;

  const [created] = await db
    .insert(services)
    .values({
      vendorId: vendorProfile.id,
      title,
      description,
      category,
      price: price.toFixed(2),
      imageUrl: imageUrl || null,
      durationMinutes: durationMinutes ?? null,
    })
    .returning();

  return NextResponse.json({ service: created }, { status: 201 });
}
