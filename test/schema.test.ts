import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { imageFileIssues } from "../lib/catalog.ts";
import { collectCatalogIssues, formatCatalogError, parseCatalog } from "../lib/schema.ts";
import { seedCatalog, testPick } from "./helpers.ts";

const messages = (data: unknown) => collectCatalogIssues(data).map((i) => i.message).join("\n");

test("committed data/catalog.json passes the schema", () => {
  assert.deepEqual(collectCatalogIssues(seedCatalog()), []);
});

test("featured tag exists and the seed has no invented picks", () => {
  const catalog = seedCatalog();
  assert.ok(catalog.categories.some((c) => c.id === "featured"));
  assert.ok(catalog.products.some((p) => p.categories.includes("featured")));
  assert.equal(catalog.picks.length, 0);
});

test("a well-formed pick is accepted", () => {
  const catalog = seedCatalog();
  catalog.picks.push(testPick());
  assert.deepEqual(collectCatalogIssues(catalog), []);
});

test("unknown references and basedOn cycles are reported readably", () => {
  const catalog = seedCatalog();
  catalog.products[3].primaryCategory = "kitchn";
  catalog.picks.push({ ...testPick(), product: "ghost" });
  const organic = catalog.tiers.find((t) => t.id === "organic")!;
  const mno = catalog.tiers.find((t) => t.id === "money-no-object")!;
  organic.basedOn = "money-no-object";
  mno.basedOn = "organic";
  const text = messages(catalog);
  assert.match(text, /Unknown category "kitchn"/);
  assert.match(text, /Unknown product "ghost"/);
  assert.match(text, /basedOn cycle/);
  assert.match(formatCatalogError(collectCatalogIssues(catalog)), /^catalog\.json is invalid:/);
});

test("image paths must live under /images/", () => {
  const catalog = seedCatalog();
  catalog.picks.push(testPick("https://example.com/x.jpg"));
  assert.match(messages(catalog), /image path starting with \/images\//);
});

test("a missing image warns and falls back to the placeholder (no failure)", async () => {
  const pub = await mkdtemp(path.join(tmpdir(), "lifestyles-pub-"));
  await mkdir(path.join(pub, "images"));
  await writeFile(path.join(pub, "images/placeholder.svg"), "<svg/>");
  const catalog = seedCatalog();
  catalog.picks.push(testPick("/images/mid-tee-main.webp"));
  const warn = console.warn;
  const warnings: string[] = [];
  console.warn = (m: string) => warnings.push(m);
  try {
    assert.deepEqual(imageFileIssues(catalog, pub), []);
  } finally {
    console.warn = warn;
  }
  assert.equal(catalog.picks[0].main.image, "/images/placeholder.svg");
  assert.match(warnings.join("\n"), /mid-tee-main\.webp.*placeholder/);
  assert.deepEqual(collectCatalogIssues(catalog), []);
});

test("a missing placeholder is still an error", async () => {
  const pub = await mkdtemp(path.join(tmpdir(), "lifestyles-pub-"));
  assert.equal(imageFileIssues(seedCatalog(), pub).length, 1);
});

test("legacy single alt is accepted and normalised to alts", () => {
  const catalog = seedCatalog() as unknown as { picks: unknown[] };
  const { alts, ...rest } = testPick();
  catalog.picks.push({ ...rest, alt: alts[0] });
  const parsed = parseCatalog(catalog);
  assert.equal(parsed.picks[0].alts.length, 1);
});

test("more than 3 alts, or alt and alts together, are rejected", () => {
  const catalog = seedCatalog();
  const pick = testPick();
  pick.alts = [pick.alts[0], pick.alts[0], pick.alts[0], pick.alts[0]];
  catalog.picks.push(pick);
  assert.match(messages(catalog), /at most 3 alternatives/);
  const both = seedCatalog() as unknown as { picks: unknown[] };
  const p = testPick();
  both.picks.push({ ...p, alt: p.alts[0] });
  assert.match(messages(both), /not both/);
});
