import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Service images can come from a vendor-supplied URL (any host) or our
  // own category-fallback CDN (picsum.photos), so we render them with a
  // plain <img> tag rather than next/image — next/image requires every
  // remote hostname to be allow-listed in advance, which doesn't work for
  // arbitrary vendor-pasted URLs. The tradeoff (no automatic image
  // optimization) is acceptable for this assessment's scope.
};

export default nextConfig;
