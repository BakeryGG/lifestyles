/**
 * Load workbook tabs from a public Google Sheet (gviz CSV) or a local directory
 * of `<tab>.csv` files. The README tab is never read. `settings` is optional.
 * `lifestyles` falls back to a legacy `tiers` tab when it is missing or empty.
 * There is no sections tab.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseCsv } from "./csv.ts";
import type { SheetTables } from "./convert.ts";

export class SheetReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SheetReadError";
  }
}

/** The sheet could not be reached at all (network, 401/403/404, an HTML login page). */
export class SheetUnreachableError extends SheetReadError {
  constructor(message: string) {
    super(message);
    this.name = "SheetUnreachableError";
  }
}

function googleCsvUrl(sheetId: string, tab: string): string {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}`;
}

function googleFailure(tab: string, status: number): string {
  return `Could not read tab "${tab}" from the sheet (HTTP ${status}). Is the sheet shared as 'Anyone with the link can view' and is the tab named exactly "${tab}"?`;
}

function isHtml(contentType: string, body: string): boolean {
  if (contentType.toLowerCase().includes("text/html")) return true;
  const trimmed = body.replace(/^\uFEFF/, "").trimStart();
  return trimmed.startsWith("<");
}

type TabCsv = { rows: string[][] } | { missing: true } | { failed: true; status: number };

async function fetchGoogleTab(sheetId: string, tab: string): Promise<TabCsv> {
  let response: Response;
  try {
    response = await fetch(googleCsvUrl(sheetId, tab));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new SheetUnreachableError(
      `Could not read tab "${tab}" from the sheet (${detail}). Is the sheet shared as 'Anyone with the link can view' and is the tab named exactly "${tab}"?`,
    );
  }
  const body = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || isHtml(contentType, body)) {
    return { failed: true, status: response.status };
  }
  if (body.replace(/^\uFEFF/, "").trim() === "") return { missing: true };
  const rows = parseCsv(body);
  if (rows.length === 0) return { missing: true };
  return { rows };
}

function isEnoent(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ENOENT";
}

async function readLocalTab(dir: string, tab: string): Promise<TabCsv> {
  const file = path.join(dir, `${tab}.csv`);
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if (isEnoent(error)) return { missing: true };
    throw error;
  }
  if (text.replace(/^\uFEFF/, "").trim() === "") return { missing: true };
  const rows = parseCsv(text);
  if (rows.length === 0) return { missing: true };
  return { rows };
}

function assertRows(tab: string, loaded: TabCsv, describe: (tab: string) => string): string[][] {
  if ("rows" in loaded) return loaded.rows;
  if ("failed" in loaded) throw new SheetUnreachableError(googleFailure(tab, loaded.status));
  throw new SheetReadError(describe(tab));
}

export async function loadTables(source: { sheetId: string } | { csvDir: string }): Promise<SheetTables> {
  const read = "sheetId" in source
    ? (tab: string) => fetchGoogleTab(source.sheetId, tab)
    : (tab: string) => readLocalTab(source.csvDir, tab);

  const localMiss = (tab: string) => {
    const dir = "csvDir" in source ? source.csvDir : "";
    return `Could not read tab "${tab}" from ${dir} (file not found or empty). Expected ${path.join(dir, `${tab}.csv`)}.`;
  };

  let lifestyles = await read("lifestyles");
  let lifestylesTab = "lifestyles";
  if (!("rows" in lifestyles)) {
    const legacy = await read("tiers");
    if ("rows" in legacy) {
      lifestyles = legacy;
      lifestylesTab = "tiers";
    }
  }

  const categories = await read("categories");
  const products = await read("products");
  const picks = await read("picks");
  const alternatives = await read("alternatives");
  const settings = await read("settings");

  const lifestylesRows = assertRows(
    lifestylesTab,
    lifestyles,
    () => {
      if ("sheetId" in source && "failed" in lifestyles) return googleFailure(lifestylesTab, lifestyles.status);
      return `Could not read tab "lifestyles" (or legacy "tiers") from ${"csvDir" in source ? source.csvDir : "the sheet"}.`;
    },
  );

  return {
    lifestyles: lifestylesRows,
    lifestylesTab,
    categories: assertRows("categories", categories, localMiss),
    products: assertRows("products", products, localMiss),
    picks: assertRows("picks", picks, localMiss),
    alternatives: "rows" in alternatives ? alternatives.rows : null,
    settings: "rows" in settings ? settings.rows : null,
  };
}
