import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export so the app deploys to Netlify as a static PWA.
  output: "export",
  // next/image optimization is unavailable in static export.
  images: { unoptimized: true },
  // Keep clean folder-style URLs on static hosts.
  trailingSlash: true,
};

export default nextConfig;
