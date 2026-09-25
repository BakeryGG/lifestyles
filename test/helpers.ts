import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stringifyCsv } from "../scripts/lib/csv.ts";
import type { CatalogPick, CatalogShape, SheetRows } from "../scripts/lib/convert.ts";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The committed seed catalog (no picks). Fresh copy each call. */
export function seedCatalog(): CatalogShape {
  return JSON.parse(readFileSync(path.join(ROOT, "data/catalog.json"), "utf8")) as CatalogShape;
}

/** Obviously fake pick for tests only. Never committed to data/. */
export function testPick(image = "/images/placeholder.svg"): CatalogPick {
  const item = {
    brand: "Test Brand",
    name: "Test Tee",
    price: 20,
    currency: "USD",
    url: "https://example.com/tee",
    image,
    why: "Test reason",
  };
  const { why: _why, ...altBase } = item;
  void _why;
  return { tier: "mid", product: "tee", main: item, alts: [{ ...altBase, name: "Test Alt", when: "Test when" }] };
}

export async function writeSheetDir(dir: string, sheets: SheetRows): Promise<void> {
  await mkdir(dir, { recursive: true });
  for (const tab of ["lifestyles", "categories", "products", "picks", "alternatives", "settings"] as const) {
    await writeFile(path.join(dir, `${tab}.csv`), stringifyCsv(sheets[tab]), "utf8");
  }
}

export function runCli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    if (env.FORCE_COLOR && env.NO_COLOR) delete env.NO_COLOR;
    const child = spawn(process.execPath, ["--import", "tsx", "scripts/sheet-to-catalog.ts", ...args], { cwd: ROOT, env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c));
    child.stderr.on("data", (c) => (stderr += c));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}
