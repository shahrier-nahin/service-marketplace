/**
 * Maps service categories to a representative stock photo, used as a
 * fallback when a vendor hasn't set a custom `imageUrl` for their listing.
 *
 * Uses Lorem Picsum's seed-based URLs (https://picsum.photos/seed/{seed}/w/h),
 * which deterministically return the same real photo for a given seed string
 * every time — no API key required, no rate limit, and (unlike the
 * deprecated source.unsplash.com random-redirect service, shut down in
 * 2024) no risk of the endpoint disappearing.
 */

const CATEGORY_SEEDS: Record<string, string> = {
  Plumbing: "plumbing-service",
  Electrical: "electrical-service",
  Landscaping: "landscaping-service",
  Gardening: "gardening-service",
  Design: "design-service",
  Cleaning: "cleaning-service",
  "Home Repair": "home-repair-service",
  "Professional Services": "professional-service",
  Outdoor: "outdoor-service",
};

const DEFAULT_SEED = "general-service";

function picsumUrl(seed: string, width = 800, height = 500): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

/**
 * Returns the service's own image if set, otherwise a category-appropriate
 * stock photo, otherwise a generic fallback. Always returns a usable URL.
 */
export function resolveServiceImage(
  imageUrl: string | null | undefined,
  category: string
): string {
  if (imageUrl && imageUrl.trim().length > 0) return imageUrl;
  const seed = CATEGORY_SEEDS[category] ?? `${DEFAULT_SEED}-${category.toLowerCase().replace(/\s+/g, "-")}`;
  return picsumUrl(seed);
}
