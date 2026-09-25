import fs from "node:fs";
import path from "node:path";
import { parseCatalog, type Catalog, type CatalogIssue } from "./schema";

const CATALOG_PATH = path.join(process.cwd(), "data", "catalog.json");
const PLACEHOLDER = "/images/placeholder.svg";
const VARIANT_WIDTHS = [480, 960, 1440] as const;

let cache: { mtimeMs: number; stamp: string; catalog: Catalog } | null = null;

function invalid(detail: string): Error {
  return new Error(`catalog.json is invalid:\n  - (root): ${detail}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function notFound(image: string): string {
  const display = image.startsWith("/") ? `public${image}` : `public/${image}`;
  return `File not found at ${display}`;
}

function realRootOf(root: string): string {
  try {
    return fs.realpathSync(root);
  } catch {
    return path.resolve(root);
  }
}

type ResolvedImage = { message: string | null; file: string | null };

/** Resolve an /images path. Symlinks must still land inside public/. */
export function resolveImageFile(image: string, publicDir: string): ResolvedImage {
  if (image.includes("\0") || image.includes("..")) {
    return { message: "Image path escapes public/", file: null };
  }
  const root = path.resolve(publicDir);
  const relative = image.replace(/^[/\\]+/, "");
  const resolved = path.resolve(root, relative);
  const fromRoot = path.relative(root, resolved);
  if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) {
    return { message: "Image path escapes public/", file: null };
  }

  let realFile: string;
  try {
    const stat = fs.lstatSync(resolved);
    if (!stat.isFile() && !stat.isSymbolicLink()) {
      return { message: notFound(image), file: null };
    }
    realFile = fs.realpathSync(resolved);
    if (!fs.statSync(realFile).isFile()) {
      return { message: notFound(image), file: null };
    }
  } catch {
    return { message: notFound(image), file: null };
  }

  const escaped = path.relative(realRootOf(root), realFile);
  if (escaped.startsWith("..") || path.isAbsolute(escaped)) {
    return { message: "Image path escapes public/", file: null };
  }
  return { message: null, file: realFile };
}

function referencedImages(data: unknown): string[] {
  const images = new Set<string>([PLACEHOLDER]);
  if (!isRecord(data) || !Array.isArray(data.picks)) return [...images];
  for (const pick of data.picks) {
    if (!isRecord(pick)) continue;
    for (const side of ["main", "alt"] as const) {
      const product = pick[side];
      if (isRecord(product) && typeof product.image === "string") images.add(product.image);
    }
  }
  return [...images];
}

/** Fail the build when an image path is missing, escapes public/, or the placeholder is gone. */
export function imageFileIssues(data: unknown, publicDir = path.join(process.cwd(), "public")): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const placeholder = resolveImageFile(PLACEHOLDER, publicDir);
  if (placeholder.message) {
    issues.push({
      path: ["images", "placeholder.svg"],
      message: placeholder.message,
    });
  }

  if (!isRecord(data) || !Array.isArray(data.picks)) return issues;

  data.picks.forEach((pick, index) => {
    if (!isRecord(pick)) return;
    for (const side of ["main", "alt"] as const) {
      const product = pick[side];
      if (!isRecord(product) || typeof product.image !== "string") continue;
      const resolved = resolveImageFile(product.image, publicDir);
      if (!resolved.message) continue;
      issues.push({
        path: ["picks", index, side, "image"],
        message: resolved.message,
      });
    }
  });

  return issues;
}

function imageStamp(data: unknown, publicDir: string): string {
  return referencedImages(data)
    .sort()
    .map((image) => {
      const resolved = resolveImageFile(image, publicDir);
      if (!resolved.file) return `${image}:missing`;
      try {
        const stat = fs.statSync(resolved.file);
        return `${image}:${stat.mtimeMs}:${stat.size}`;
      } catch {
        return `${image}:missing`;
      }
    })
    .join("|");
}

function readImageWidth(file: string): number | null {
  let fd: number;
  try {
    fd = fs.openSync(file, "r");
  } catch {
    return null;
  }
  try {
    const head = Buffer.alloc(32);
    const n = fs.readSync(fd, head, 0, 32, 0);
    if (n >= 24 && head[0] === 0x89 && head.toString("ascii", 1, 4) === "PNG") {
      return head.readUInt32BE(16);
    }
    if (n >= 10 && (head.toString("ascii", 0, 6) === "GIF87a" || head.toString("ascii", 0, 6) === "GIF89a")) {
      return head.readUInt16LE(6);
    }
    if (n >= 30 && head.toString("ascii", 0, 4) === "RIFF" && head.toString("ascii", 8, 12) === "WEBP") {
      if (head.toString("ascii", 12, 16) === "VP8X") {
        return 1 + (head[24]! | (head[25]! << 8) | (head[26]! << 16));
      }
    }
    if (n >= 4 && head[0] === 0xff && head[1] === 0xd8) return jpegWidth(fd);
    return null;
  } finally {
    fs.closeSync(fd);
  }
}

function jpegWidth(fd: number): number | null {
  let offset = 2;
  const buf = Buffer.alloc(8);
  for (let guard = 0; guard < 80; guard += 1) {
    const marker = Buffer.alloc(4);
    if (fs.readSync(fd, marker, 0, 4, offset) < 4) return null;
    if (marker[0] !== 0xff) return null;
    const type = marker[1];
    const len = marker.readUInt16BE(2);
    if (type === 0xc0 || type === 0xc1 || type === 0xc2 || type === 0xc3) {
      if (fs.readSync(fd, buf, 0, 6, offset + 4) < 5) return null;
      return buf.readUInt16BE(3);
    }
    if (len < 2) return null;
    offset += 2 + len;
  }
  return null;
}

/**
 * Width variants named beside the curator file, e.g. `/images/tee-480w.jpg`
 * next to `/images/tee.jpg`. SVGs and files with no variants return undefined.
 * When variants exist, the original is included too if its pixel width can be read.
 */
export function srcSetFor(image: string, publicDir = path.join(process.cwd(), "public")): string | undefined {
  const ext = path.posix.extname(image);
  if (!ext || ext.toLowerCase() === ".svg") return undefined;
  const base = image.slice(0, -ext.length);
  const parts: { url: string; width: number }[] = [];
  for (const width of VARIANT_WIDTHS) {
    const variant = `${base}-${width}w${ext}`;
    const resolved = resolveImageFile(variant, publicDir);
    if (resolved.file) parts.push({ url: variant, width });
  }
  if (parts.length === 0) return undefined;
  const original = resolveImageFile(image, publicDir);
  if (original.file) {
    const width = readImageWidth(original.file);
    if (width && width > 0 && !parts.some((part) => part.width === width)) {
      parts.push({ url: image, width });
    }
  }
  parts.sort((a, b) => a.width - b.width);
  return parts.map((part) => `${part.url} ${part.width}w`).join(", ");
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

  const publicDir = path.join(process.cwd(), "public");
  const stamp = imageStamp(data, publicDir);
  if (cache && cache.mtimeMs === stat.mtimeMs && cache.stamp === stamp) {
    return cache.catalog;
  }

  try {
    const catalog = parseCatalog(data, imageFileIssues(data, publicDir));
    cache = { mtimeMs: stat.mtimeMs, stamp, catalog };
    return catalog;
  } catch (error) {
    cache = null;
    if (error instanceof Error) throw error;
    throw invalid(String(error));
  }
}
