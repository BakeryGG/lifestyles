import type { NextConfig } from "next";

/** GitHub Pages project sites live at /<repo>. Empty keeps local and Vercel at the domain root. */
function pagesBasePath(): string {
  const raw = process.env.PAGES_BASE_PATH ?? "";
  if (!raw || raw === "/") return "";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
}

const basePath = pagesBasePath();

const nextConfig: NextConfig = {
  // Static HTML for every route. Vercel serves this export with zero extra config.
  output: "export",
  // /mid/ -> mid/index.html, which is what GitHub Pages serves. /mid redirects there.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath,
  assetPrefix: basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
