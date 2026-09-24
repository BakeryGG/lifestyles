import fs from "node:fs";
import path from "node:path";
import { parseCatalog, type Catalog } from "./schema";

const CATALOG_PATH = path.join(process.cwd(), "data", "catalog.json");

let cache: { mtimeMs: number; catalog: Catalog } | null = null;

function invalid(detail: string): Error {
  return new Error(`catalog.json is invalid:\n  - (root): ${detail}`);
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
    const catalog = parseCatalog(data);
    cache = { mtimeMs: stat.mtimeMs, catalog };
    return catalog;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw invalid(String(error));
  }
}
