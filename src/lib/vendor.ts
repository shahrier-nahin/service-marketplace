import { eq } from "drizzle-orm";
import { db } from "@/db";
import { vendorProfiles } from "@/db/schema";

/**
 * Resolves the vendor_profiles row for a given user ID. Returns null if the
 * user has no vendor profile (shouldn't happen for a VENDOR-role user given
 * registration always creates one transactionally, but we check rather than
 * assume, since a row could theoretically be missing from manual DB edits
 * or future migration issues).
 */
export async function getVendorProfileByUserId(userId: string) {
  const [profile] = await db
    .select()
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, userId))
    .limit(1);
  return profile ?? null;
}
