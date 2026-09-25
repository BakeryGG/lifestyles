/** Site prefix from `PAGES_BASE_PATH`, inlined at build time. Empty for local and Vercel. */
export function basePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!raw || raw === "/") return "";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
}

/** Prefix a root-relative URL. Catalog paths stay `/images/...`; this is render-only. */
export function withBasePath(path: string): string {
  if (!path.startsWith("/")) return path;
  const base = basePath();
  if (!base || path === base || path.startsWith(`${base}/`)) return path;
  return `${base}${path}`;
}

export function withBasePathSrcSet(srcSet: string | undefined): string | undefined {
  if (!srcSet) return srcSet;
  return srcSet
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      const space = trimmed.lastIndexOf(" ");
      if (space === -1) return withBasePath(trimmed);
      return `${withBasePath(trimmed.slice(0, space))} ${trimmed.slice(space + 1)}`;
    })
    .join(", ");
}
