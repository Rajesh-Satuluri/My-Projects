import type { NextConfig } from "next";

// Static export for GitHub Pages. The site is served from the NewVisual
// repo under /NewVisual/interview-prep, so basePath/assetPrefix match that.
// Override with NEXT_PUBLIC_BASE_PATH="" for local dev at the root if desired.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/NewVisual/interview-prep";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
