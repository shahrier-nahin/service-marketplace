import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, or, desc } from "drizzle-orm";
import { db } from "@/db";
import { services, vendorProfiles } from "@/db/schema";

// Public marketplace catalog: browse + search + filter by category.
// Deliberately NOT behind the proxy/auth layer — anyone (including
// logged-out visitors) can browse the catalog, matching a real marketplace.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q")?.trim();
  const category = searchParams.get("category")?.trim();

  const conditions = [eq(services.status, "ACTIVE")];

  if (category) {
    conditions.push(eq(services.category, category));
  }

  if (query) {
    const searchCondition = or(
      ilike(services.title, `%${query}%`),
      ilike(services.description, `%${query}%`)
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  const results = await db
    .select({
      id: services.id,
      title: services.title,
      description: services.description,
      category: services.category,
      price: services.price,
      imageUrl: services.imageUrl,
      durationMinutes: services.durationMinutes,
      createdAt: services.createdAt,
      vendorId: vendorProfiles.id,
      vendorBusinessName: vendorProfiles.businessName,
    })
    .from(services)
    .innerJoin(vendorProfiles, eq(services.vendorId, vendorProfiles.id))
    .where(and(...conditions))
    .orderBy(desc(services.createdAt));

  return NextResponse.json({ services: results });
}
