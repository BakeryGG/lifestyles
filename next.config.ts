import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML for every route. Vercel serves this export with zero extra config.
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
