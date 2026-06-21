import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { services, vendorProfiles } from "@/db/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [result] = await db
    .select({
      id: services.id,
      title: services.title,
      description: services.description,
      category: services.category,
      price: services.price,
      imageUrl: services.imageUrl,
      durationMinutes: services.durationMinutes,
      status: services.status,
      createdAt: services.createdAt,
      vendorId: vendorProfiles.id,
      vendorBusinessName: vendorProfiles.businessName,
      vendorDescription: vendorProfiles.description,
    })
    .from(services)
    .innerJoin(vendorProfiles, eq(services.vendorId, vendorProfiles.id))
    .where(eq(services.id, id))
    .limit(1);

  if (!result || result.status !== "ACTIVE") {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  return NextResponse.json({ service: result });
}
