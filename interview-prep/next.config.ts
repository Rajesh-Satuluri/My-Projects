import type { NextConfig } from "next";

// Static export for GitHub Pages. The repo's Pages site is served under
// /My-Projects, so basePath/assetPrefix are set to match. Override with
// NEXT_PUBLIC_BASE_PATH="" for local dev at the root if desired.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/My-Projects/interview-prep";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
