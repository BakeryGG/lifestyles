import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { collectCatalogIssues } from "../lib/schema.ts";
import { parseCsv, stringifyCsv } from "../scripts/lib/csv.ts";
import { catalogToSheet, sheetToCatalog, type SheetRows } from "../scripts/lib/convert.ts";
import { loadTables, SheetUnreachableError } from "../scripts/lib/fetch.ts";
import { runCli, seedCatalog, testPick, writeSheetDir } from "./helpers.ts";

function throughCsv(sheets: SheetRows): SheetRows {
  const out = {} as SheetRows;
  for (const tab of ["lifestyles", "categories", "products", "picks", "alternatives", "settings"] as const) {
    out[tab] = parseCsv(stringifyCsv(sheets[tab]));
  }
  return out;
}

function setCell(rows: string[][], sheetRow: number, header: string, value: string): void {
  const index = rows[0].indexOf(header);
  assert.ok(index >= 0, `no column ${header}`);
  rows[sheetRow - 1][index] = value;
}

test("CSV parser handles quotes, commas and newlines", () => {
  const rows = [["a", "b,c", 'say "hi"', "two\nlines"]];
  assert.deepEqual(parseCsv(stringifyCsv(rows)), rows);
});

test("seed catalog round-trips through the sheet format unchanged", () => {
  const seed = seedCatalog();
  const result = sheetToCatalog(throughCsv(catalogToSheet(seed)));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.catalog, seed);
  assert.deepEqual(collectCatalogIssues(result.catalog), []);
});

test("a pick with an /images/ path round-trips", () => {
  const seed = seedCatalog();
  seed.picks.push(testPick("/images/mid-tee-main.webp"));
  const result = sheetToCatalog(throughCsv(catalogToSheet(seed)));
  assert.deepEqual(result.errors, []);
  assert.equal(result.catalog.picks[0].main.image, "/images/mid-tee-main.webp");
});

test("unreachable sheet (401 / HTML / network) throws SheetUnreachableError", async () => {
  const real = globalThis.fetch;
  try {
    globalThis.fetch = (async () => new Response("denied", { status: 401 })) as typeof fetch;
    await assert.rejects(loadTables({ sheetId: "x" }), (e) => e instanceof SheetUnreachableError && /HTTP 401/.test(e.message));
    globalThis.fetch = (async () => new Response("<!doctype html><html>login</html>", { status: 200, headers: { "content-type": "text/html" } })) as typeof fetch;
    await assert.rejects(loadTables({ sheetId: "x" }), SheetUnreachableError);
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await assert.rejects(loadTables({ sheetId: "x" }), SheetUnreachableError);
  } finally {
    globalThis.fetch = real;
  }
});

test("CLI: valid CSVs exit 0; bad cell exits 1 with row/column and leaves output untouched", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "lifestyles-sheet-"));
  const out = path.join(dir, "catalog.json");
  const sheets = catalogToSheet(seedCatalog());
  await writeSheetDir(path.join(dir, "ok"), sheets);
  const ok = await runCli(["--csv-dir", path.join(dir, "ok"), "--out", out]);
  assert.equal(ok.code, 0, ok.stderr);
  assert.deepEqual(JSON.parse(await readFile(out, "utf8")), seedCatalog());

  await writeFile(out, "SENTINEL");
  setCell(sheets.products, 5, "primaryCategory", "kitchn");
  await writeSheetDir(path.join(dir, "bad"), sheets);
  const bad = await runCli(["--csv-dir", path.join(dir, "bad"), "--out", out]);
  assert.equal(bad.code, 1);
  assert.match(bad.stderr, /products.*row 5/i);
  assert.equal(await readFile(out, "utf8"), "SENTINEL");
});

function altRow(header: string[], values: Record<string, string>): string[] {
  const base: Record<string, string> = {
    tier: "mid",
    product: "tee",
    order: "1",
    brand: "Test Brand",
    name: "Alt",
    price: "30",
    currency: "USD",
    url: "https://example.com/alt",
    image: "/images/mid-tee-alt1.webp",
    alt_when: "If testing",
  };
  const merged = { ...base, ...values };
  return header.map((h) => merged[h] ?? "");
}

function withPick() {
  const seed = seedCatalog();
  const pick = testPick();
  pick.alts = [];
  seed.picks.push(pick);
  return catalogToSheet(seed);
}

test("a main pick without alternatives is valid", () => {
  const result = sheetToCatalog(throughCsv(withPick()));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.catalog.picks[0].alts, []);
  assert.deepEqual(collectCatalogIssues(result.catalog), []);
});

test("alternatives tab: sorted by order, legacy picks alt_* first (order 0), max 3 with a warning", () => {
  const sheets = withPick();
  const h = sheets.alternatives[0];
  sheets.alternatives.push(altRow(h, { order: "3", name: "Third" }), altRow(h, { order: "1", name: "First" }), altRow(h, { order: "2", name: "Second" }));
  let result = sheetToCatalog(throughCsv(sheets));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.catalog.picks[0].alts.map((a) => a.name), ["First", "Second", "Third"]);
  assert.equal(result.catalog.picks[0].alts[0].when, "If testing");

  // Legacy alt_* columns on the picks row: order 0, so it comes first and pushes Third out.
  const p = sheets.picks;
  const legacy = { alt_brand: "Legacy Brand", alt_name: "Legacy", alt_price: "25", alt_currency: "USD", alt_url: "https://example.com/l", alt_image: "/images/l.webp", alt_when: "If legacy" };
  for (const [k, v] of Object.entries(legacy)) {
    p[0].push(k);
    p[1].push(v);
  }
  result = sheetToCatalog(throughCsv(sheets));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.catalog.picks[0].alts.map((a) => a.name), ["Legacy", "First", "Second"]);
  assert.match(result.warnings.join("\n"), /alternatives, row 2: alternative skipped \(at most 3/);
});

test("incomplete rows are skipped with warnings, never errors", () => {
  const sheets = withPick();
  const price = sheets.picks[0].indexOf("main_price");
  sheets.picks[1][price] = "";
  let result = sheetToCatalog(throughCsv(sheets));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.catalog.picks, []);
  assert.match(result.warnings.join("\n"), /picks, row 2: main pick skipped, incomplete \(main_price: Required\)/);

  const noUrl = withPick();
  noUrl.picks[1][noUrl.picks[0].indexOf("main_url")] = "";
  result = sheetToCatalog(throughCsv(noUrl));
  assert.deepEqual(result.errors, []);
  assert.match(result.warnings.join("\n"), /main_url: Required/);

  const alts = withPick();
  const h = alts.alternatives[0];
  alts.alternatives.push(altRow(h, { url: "", name: "No url" }), altRow(h, { order: "7" }), altRow(h, { order: "2", image: "", name: "No image" }));
  result = sheetToCatalog(throughCsv(alts));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.catalog.picks[0].alts.map((a) => [a.name, a.image]), [["No image", "/images/placeholder.svg"]]);
  const w = result.warnings.join("\n");
  assert.match(w, /alternatives, row 2: alternative skipped, incomplete \(url: Required\)/);
  assert.match(w, /order must be 1, 2 or 3/);
  assert.match(w, /using the placeholder/);
});

test("bad ids are still errors, even on rows that are otherwise skipped", () => {
  const sheets = withPick();
  sheets.alternatives.push(altRow(sheets.alternatives[0], { product: "ghost" }));
  const result = sheetToCatalog(throughCsv(sheets));
  assert.match(result.errors.map((e) => `${e.tab} ${e.row} ${e.message}`).join("\n"), /alternatives 2 Unknown product "ghost"/);
});

test("a missing alternatives tab is fine; a wrong tab returned in its place only warns", () => {
  const sheets = withPick();
  const missing = sheetToCatalog({ ...throughCsv(sheets), alternatives: null });
  assert.deepEqual(missing.errors, []);
  const wrong = sheetToCatalog({ ...throughCsv(sheets), alternatives: [["Welcome"], ["How to use this sheet"]] });
  assert.deepEqual(wrong.errors, []);
  assert.match(wrong.warnings.join("\n"), /alternatives: tab not found/);
});

test("pick with 3 alternatives round-trips through picks + alternatives tabs", () => {
  const seed = seedCatalog();
  const pick = testPick();
  pick.alts.push({ ...pick.alts[0], name: "Second Alt" }, { ...pick.alts[0], name: "Third Alt" });
  seed.picks.push(pick);
  const result = sheetToCatalog(throughCsv(catalogToSheet(seed)));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.catalog, seed);
});

test("CLI: incomplete main pick still exits 0 and writes the catalog", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "lifestyles-sheet-"));
  const sheets = withPick();
  sheets.picks[1][sheets.picks[0].indexOf("main_url")] = "";
  await writeSheetDir(dir, sheets);
  const out = path.join(dir, "catalog.json");
  const run = await runCli(["--csv-dir", dir, "--out", out]);
  assert.equal(run.code, 0, run.stderr);
  assert.match(run.stderr, /main pick skipped/);
  assert.equal(JSON.parse(await readFile(out, "utf8")).picks.length, 0);
});
