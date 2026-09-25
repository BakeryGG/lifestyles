import fs from "node:fs";
import path from "node:path";
import { parseCatalog, type Catalog, type CatalogIssue } from "./schema";

const CATALOG_PATH = path.join(process.cwd(), "data", "catalog.json");

let cache: { mtimeMs: number; catalog: Catalog } | null = null;

function invalid(detail: string): Error {
  return new Error(`catalog.json is invalid:\n  - (root): ${detail}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function imageIssueMessage(image: string, root: string): string | null {
  if (image.includes("\0")) return "Image path escapes public/";
  const relative = image.replace(/^[/\\]+/, "");
  const resolved = path.resolve(root, relative);
  const fromRoot = path.relative(root, resolved);
  if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) {
    return "Image path escapes public/";
  }
  try {
    if (fs.statSync(resolved).isFile()) return null;
  } catch {
    // Missing, or not a file.
  }
  const display = image.startsWith("/") ? `public${image}` : `public/${image}`;
  return `File not found at ${display}`;
}

/** Fail the build when an image path is missing or escapes public/. */
export function imageFileIssues(data: unknown, publicDir = path.join(process.cwd(), "public")): CatalogIssue[] {
  if (!isRecord(data) || !Array.isArray(data.picks)) return [];
  const root = path.resolve(publicDir);
  const issues: CatalogIssue[] = [];

  data.picks.forEach((pick, index) => {
    if (!isRecord(pick)) return;
    for (const side of ["main", "alt"] as const) {
      const product = pick[side];
      if (!isRecord(product) || typeof product.image !== "string") continue;
      const message = imageIssueMessage(product.image, root);
      if (!message) continue;
      issues.push({
        path: ["picks", index, side, "image"],
        message,
      });
    }
  });

  return issues;
}

/**
 * Read and validate data/catalog.json. Throws an Error whose message is the
 * human-readable problem list (no Zod stack). Used by pages at build time and
 * by `npm run validate`.
 */
export function loadCatalog(): Catalog {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(CATALOG_PATH);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw invalid(`Could not read data/catalog.json (${detail})`);
  }

  if (cache && cache.mtimeMs === stat.mtimeMs) {
    return cache.catalog;
  }

  let text: string;
  try {
    text = fs.readFileSync(CATALOG_PATH, "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw invalid(`Could not read data/catalog.json (${detail})`);
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw invalid(detail);
  }

  try {
    const catalog = parseCatalog(data, imageFileIssues(data));
    cache = { mtimeMs: stat.mtimeMs, catalog };
    return catalog;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw invalid(String(error));
  }
}
