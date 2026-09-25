/**
 * Pure sheet <-> catalog conversion (v2: tags + product types).
 *
 * The lifestyles tab is the user-facing name; the JSON key stays `tiers`.
 * If a workbook still has a `tiers` tab, the caller passes lifestylesTab: "tiers"
 * and every error names that tab.
 *
 * Sheet row numbers are the spreadsheet's own numbers: header is row 1, and blank
 * or comment rows still count so the number matches what you see in Google Sheets.
 *
 * exampleBrands, brandChips, product categories, and compareProducts are joined
 * with ", " on the way out and split on commas on the way in. A value that itself
 * contains a comma cannot round-trip. That limitation is accepted.
 *
 * Picks are sparse: a row is emitted only when main_brand is a real brand.
 * Blank, "TODO", and "TODO:" notes are skipped (see isPlaceholderBrand).
 * primaryCategory is always written first in product.categories, then the other
 * tag ids from the cell, with duplicates dropped.
 */
import { isPlaceholderBrand } from "../../lib/copy.ts";
import {
  altSchema,
  itemSchema,
  MAX_ALTERNATIVES,
  unknownLifestyleMessage,
  unknownProductMessage,
  formatIssuePath,
  referenceIssues,
  type CatalogIssue,
} from "../../lib/schema.ts";

export type SheetError = {
  tab: string;
  /** 1-based spreadsheet row. Omit for tab-level problems (missing column, missing key). */
  row?: number;
  column?: string;
  message: string;
  path?: PropertyKey[];
};

export type SheetLocation = {
  tab: string;
  row?: number;
  column?: string;
};

export type SheetTables = {
  lifestyles: string[][];
  /** Tab the lifestyles rows were actually read from. Defaults to "lifestyles". */
  lifestylesTab?: string;
  categories: string[][];
  products: string[][];
  picks: string[][];
  /** Optional tab: tier, product, order (1-3), brand, name, price, currency, url, image, alt_when, price_checked. */
  alternatives?: string[][] | null;
  settings?: string[][] | null;
};

export type CatalogItem = {
  brand: string;
  name: string;
  price: number;
  currency: string;
  url: string;
  image: string;
  why?: string;
};

export type CatalogAlt = CatalogItem & { when?: string };

export type CatalogTier = {
  id: string;
  name: string;
  description: string;
  whoFor?: string;
  exampleBrands: string[];
  brandChips?: string[];
  status: string;
  accent: string;
  group?: string;
  basedOn?: string;
};

export type CatalogCategory = {
  id: string;
  name: string;
  order: number;
  description?: string;
};

export type CatalogProductType = {
  id: string;
  name: string;
  primaryCategory: string;
  categories: string[];
  order: number;
};

export type CatalogLanding = {
  anchorProduct?: string;
  compareProducts?: string[];
};

export type CatalogPick = {
  tier: string;
  product: string;
  main: CatalogItem;
  /** Up to 3, in display order (alt_order, then sheet row). */
  alts: CatalogAlt[];
};

export type CatalogShape = {
  tiers: CatalogTier[];
  categories: CatalogCategory[];
  products: CatalogProductType[];
  landing: CatalogLanding;
  picks: CatalogPick[];
};

export type SheetRows = {
  lifestyles: string[][];
  categories: string[][];
  products: string[][];
  picks: string[][];
  alternatives: string[][];
  settings: string[][];
};

export type ConvertResult = {
  catalog: CatalogShape;
  errors: SheetError[];
  warnings: string[];
  locations: Map<string, SheetLocation>;
};

const LIFESTYLE_HEADER = [
  "id",
  "name",
  "description",
  "status",
  "exampleBrands",
  "accent",
  "group",
  "basedOn",
  "whoFor",
  "brandChips",
] as const;

const LIFESTYLE_REQUIRED = ["id", "name", "description", "status", "exampleBrands", "accent"] as const;

/** Required on the picks tab. alt_* columns are optional (legacy: an alternative with order 0). */
const PICK_FIELDS = [
  "main_brand",
  "main_name",
  "main_price",
  "main_currency",
  "main_url",
  "main_image",
] as const;

const ALT_FIELDS = ["product", "order", "brand", "name", "price", "currency", "url", "image"] as const;

const PLACEHOLDER_IMAGE = "/images/placeholder.svg";

const GROUPS = new Set(["primary", "secondary"]);

const SETTING_KEYS: Record<string, "anchorProduct" | "compareProducts"> = {
  anchorproduct: "anchorProduct",
  anchorcategory: "anchorProduct",
  compareproducts: "compareProducts",
  comparecategories: "compareProducts",
  comparisoncategories: "compareProducts",
};

const TAB_RANK: Record<string, number> = {
  lifestyles: 0,
  tiers: 1,
  categories: 2,
  products: 3,
  picks: 4,
  settings: 5,
};

const UNSUPPORTED =
  "are filled in but the site does not support them yet — leave blank or update the site schema";

type ColumnIndex = Map<string, number>;

type OrderedRow = {
  order: number;
  validOrder: boolean;
  seq: number;
  sheetRow: number;
};

function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/\s+\([^)]*\)\s*$/, "")
    .trim()
    .toLowerCase();
}

function indexHeaders(header: string[] | undefined): ColumnIndex {
  const index: ColumnIndex = new Map();
  if (!header) return index;
  header.forEach((cellValue, column) => {
    const key = normalizeHeader(cellValue);
    if (!key || index.has(key)) return;
    index.set(key, column);
  });
  return index;
}

function cell(row: string[], columns: ColumnIndex, name: string): string {
  const at = columns.get(name.toLowerCase());
  if (at === undefined) return "";
  return (row[at] ?? "").trim();
}

function isBlankRow(row: string[]): boolean {
  return row.every((value) => value.trim() === "");
}

function isCommentRow(row: string[]): boolean {
  return (row[0] ?? "").trim().startsWith("#");
}

function locKey(path: PropertyKey[]): string {
  return JSON.stringify(path);
}

function requireColumns(
  tab: string,
  columns: ColumnIndex,
  names: readonly string[],
  errors: SheetError[],
): void {
  for (const name of names) {
    if (!columns.has(name.toLowerCase())) {
      errors.push({ tab, message: `missing column ${JSON.stringify(name)}` });
    }
  }
}

function splitList(value: string): string[] {
  if (value.trim() === "") return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function joinList(values: readonly string[] | undefined): string {
  if (!values || values.length === 0) return "";
  return values.join(", ");
}

/**
 * Strip one leading $ / € / £ and thousands commas. "1,299.00" -> 1299.
 * Returns an error message, or blank when the cell is empty.
 */
function parsePrice(
  raw: string,
): { ok: true; value: number } | { ok: false; message: string } | { ok: false; blank: true } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false, blank: true };
  const stripped = trimmed.replace(/^[$€£]/, "").trim().replaceAll(",", "");
  if (stripped === "" || !Number.isFinite(Number(stripped))) {
    return { ok: false, message: `Expected a number (got ${JSON.stringify(trimmed)})` };
  }
  return { ok: true, value: Number(stripped) };
}

function parseWholeNumber(raw: string): { ok: true; value: number } | { ok: false } {
  const trimmed = raw.trim();
  if (!/^[+-]?\d+$/.test(trimmed)) return { ok: false };
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value)) return { ok: false };
  return { ok: true, value };
}

function sortRank(row: OrderedRow): number {
  return row.validOrder ? row.order : Number.POSITIVE_INFINITY;
}

function sortByOrder<T extends OrderedRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => sortRank(a) - sortRank(b) || a.seq - b.seq);
}

/** primaryCategory first, then the cell's tag ids, duplicates dropped. */
function normalizeCategories(primary: string, raw: string): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const push = (id: string) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    result.push(id);
  };
  push(primary);
  for (const id of splitList(raw)) push(id);
  return result;
}

function registerItem(
  locations: Map<string, SheetLocation>,
  path: PropertyKey[],
  tab: string,
  sheetRow: number,
  prefix: "main" | "alt",
): void {
  const fields = ["brand", "name", "price", "currency", "url", "image", "why"] as const;
  for (const field of fields) {
    locations.set(locKey([...path, field]), {
      tab,
      row: sheetRow,
      column: `${prefix}_${field}`,
    });
  }
  if (prefix === "alt") {
    locations.set(locKey([...path, "when"]), { tab, row: sheetRow, column: "alt_when" });
  }
}

export function sheetToCatalog(tables: SheetTables): ConvertResult {
  const lifestylesTab = tables.lifestylesTab || "lifestyles";
  const errors: SheetError[] = [];
  const warnings: string[] = [];
  const locations = new Map<string, SheetLocation>();

  locations.set(locKey(["tiers"]), { tab: lifestylesTab });
  locations.set(locKey(["categories"]), { tab: "categories" });
  locations.set(locKey(["products"]), { tab: "products" });
  locations.set(locKey(["picks"]), { tab: "picks" });
  locations.set(locKey(["landing"]), { tab: "settings" });

  const tiers = readLifestyles(tables.lifestyles, lifestylesTab, errors, locations);
  const categories = readCategories(tables.categories, errors, locations);
  const products = readProducts(tables.products, errors, locations);
  pendingIdChecks.length = 0;
  const picks = readPicks(tables.picks, tables.alternatives, errors, warnings, locations);
  for (const check of pendingIdChecks.splice(0)) {
    if (check.tier && !tiers.some((tier) => tier.id === check.tier)) {
      errors.push({ tab: check.tab, row: check.sheetRow, column: check.tierCol, message: unknownLifestyleMessage(check.tier) });
    }
    if (check.product && !products.some((product) => product.id === check.product)) {
      errors.push({ tab: check.tab, row: check.sheetRow, column: check.productCol, message: unknownProductMessage(check.product) });
    }
  }
  const landing = readSettings(tables.settings, warnings, errors, locations);

  const catalog: CatalogShape = { tiers, categories, products, landing, picks };
  attachReferenceErrors(catalog, errors, locations, lifestylesTab);
  return { catalog, errors, warnings, locations };
}

function readLifestyles(
  rows: string[][],
  tab: string,
  errors: SheetError[],
  locations: Map<string, SheetLocation>,
): CatalogTier[] {
  const columns = indexHeaders(rows[0]);
  requireColumns(tab, columns, LIFESTYLE_REQUIRED, errors);
  const tiers: CatalogTier[] = [];

  rows.forEach((row, index) => {
    if (index === 0) return;
    const sheetRow = index + 1;
    if (isBlankRow(row) || isCommentRow(row)) return;

    const id = cell(row, columns, "id");
    const name = cell(row, columns, "name");
    const description = cell(row, columns, "description");
    const status = cell(row, columns, "status");
    const accent = cell(row, columns, "accent");
    const exampleBrands = splitList(cell(row, columns, "exampleBrands"));
    const catalogIndex = tiers.length;
    // Key order: id, name, description, whoFor, exampleBrands, brandChips, status, accent, group, basedOn.
    const tier = { id, name, description } as CatalogTier;

    const whoFor = columns.has("whofor") ? cell(row, columns, "whoFor") : "";
    if (whoFor) tier.whoFor = whoFor;
    tier.exampleBrands = exampleBrands;
    if (columns.has("brandchips")) {
      const chips = splitList(cell(row, columns, "brandChips"));
      if (chips.length > 0) tier.brandChips = chips;
    }
    tier.status = status;
    tier.accent = accent;

    const group = columns.has("group") ? cell(row, columns, "group") : "";
    if (group) {
      if (!GROUPS.has(group)) {
        errors.push({
          tab,
          row: sheetRow,
          column: "group",
          message: "Expected primary or secondary",
          path: ["tiers", catalogIndex, "group"],
        });
      } else {
        tier.group = group;
      }
    }

    const basedOn = columns.has("basedon") ? cell(row, columns, "basedOn") : "";
    if (basedOn) tier.basedOn = basedOn;

    const base: SheetLocation = { tab, row: sheetRow };
    locations.set(locKey(["tiers", catalogIndex]), base);
    for (const column of [
      "id",
      "name",
      "description",
      "whoFor",
      "exampleBrands",
      "brandChips",
      "status",
      "accent",
      "group",
      "basedOn",
    ]) {
      locations.set(locKey(["tiers", catalogIndex, column]), { tab, row: sheetRow, column });
    }

    tiers.push(tier);
  });

  return tiers;
}

function readCategories(
  rows: string[][],
  errors: SheetError[],
  locations: Map<string, SheetLocation>,
): CatalogCategory[] {
  const columns = indexHeaders(rows[0]);
  requireColumns("categories", columns, ["id", "name", "order"], errors);
  const annotated: (OrderedRow & { id: string; name: string; description: string })[] = [];

  rows.forEach((row, index) => {
    if (index === 0) return;
    const sheetRow = index + 1;
    if (isBlankRow(row) || isCommentRow(row)) return;
    const parsed = parseWholeNumber(cell(row, columns, "order"));
    annotated.push({
      order: parsed.ok ? parsed.value : 0,
      validOrder: parsed.ok,
      seq: annotated.length,
      sheetRow,
      id: cell(row, columns, "id"),
      name: cell(row, columns, "name"),
      description: columns.has("description") ? cell(row, columns, "description") : "",
    });
  });

  return sortByOrder(annotated).map((item, catalogIndex) => {
    const base = { tab: "categories", row: item.sheetRow };
    locations.set(locKey(["categories", catalogIndex]), base);
    locations.set(locKey(["categories", catalogIndex, "id"]), { ...base, column: "id" });
    locations.set(locKey(["categories", catalogIndex, "name"]), { ...base, column: "name" });
    locations.set(locKey(["categories", catalogIndex, "order"]), { ...base, column: "order" });
    locations.set(locKey(["categories", catalogIndex, "description"]), { ...base, column: "description" });
    if (!item.validOrder) {
      errors.push({
        tab: "categories",
        row: item.sheetRow,
        column: "order",
        message: "Expected a whole number",
        path: ["categories", catalogIndex, "order"],
      });
    }
    const category: CatalogCategory = { id: item.id, name: item.name, order: item.order };
    if (item.description) category.description = item.description;
    return category;
  });
}

function readProducts(
  rows: string[][],
  errors: SheetError[],
  locations: Map<string, SheetLocation>,
): CatalogProductType[] {
  const columns = indexHeaders(rows[0]);
  requireColumns("products", columns, ["id", "name", "primaryCategory", "categories", "order"], errors);
  const annotated: (OrderedRow & {
    id: string;
    name: string;
    primaryCategory: string;
    categories: string[];
  })[] = [];

  rows.forEach((row, index) => {
    if (index === 0) return;
    const sheetRow = index + 1;
    if (isBlankRow(row) || isCommentRow(row)) return;
    const parsed = parseWholeNumber(cell(row, columns, "order"));
    const primaryCategory = cell(row, columns, "primaryCategory");
    annotated.push({
      order: parsed.ok ? parsed.value : 0,
      validOrder: parsed.ok,
      seq: annotated.length,
      sheetRow,
      id: cell(row, columns, "id"),
      name: cell(row, columns, "name"),
      primaryCategory,
      categories: normalizeCategories(primaryCategory, cell(row, columns, "categories")),
    });
  });

  return sortByOrder(annotated).map((item, catalogIndex) => {
    const base = { tab: "products", row: item.sheetRow };
    locations.set(locKey(["products", catalogIndex]), base);
    locations.set(locKey(["products", catalogIndex, "id"]), { ...base, column: "id" });
    locations.set(locKey(["products", catalogIndex, "name"]), { ...base, column: "name" });
    locations.set(locKey(["products", catalogIndex, "primaryCategory"]), { ...base, column: "primaryCategory" });
    locations.set(locKey(["products", catalogIndex, "categories"]), { ...base, column: "categories" });
    locations.set(locKey(["products", catalogIndex, "order"]), { ...base, column: "order" });
    item.categories.forEach((_, categoryIndex) => {
      locations.set(locKey(["products", catalogIndex, "categories", categoryIndex]), {
        ...base,
        column: "categories",
      });
    });
    if (!item.validOrder) {
      errors.push({
        tab: "products",
        row: item.sheetRow,
        column: "order",
        message: "Expected a whole number",
        path: ["products", catalogIndex, "order"],
      });
    }
    return {
      id: item.id,
      name: item.name,
      primaryCategory: item.primaryCategory,
      categories: item.categories,
      order: item.order,
    };
  });
}

type RawItem = Record<"brand" | "name" | "price" | "currency" | "url" | "image" | "why" | "when", string>;

/**
 * Build and validate one item. Incomplete or malformed items are skipped with a warning
 * (never an error): a main falls back to "Pick coming", an alternative is dropped.
 * A blank image becomes the placeholder.
 */
function completeItem(
  raw: RawItem,
  kind: "main" | "alt",
  where: string,
  column: (field: string) => string,
  warnings: string[],
): CatalogAlt | null {
  const problems: string[] = [];
  const parsed = parsePrice(raw.price);
  let price = 0;
  if (parsed.ok) price = parsed.value;
  else problems.push(`${column("price")}: ${"blank" in parsed ? "Required" : parsed.message}`);
  const item: CatalogAlt = {
    brand: raw.brand,
    name: raw.name,
    price,
    currency: raw.currency.toUpperCase(),
    url: raw.url,
    image: raw.image || PLACEHOLDER_IMAGE,
  };
  if (raw.why) item.why = raw.why;
  if (kind === "alt" && raw.when) item.when = raw.when;
  const result = (kind === "alt" ? altSchema : itemSchema).safeParse(item);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (field === "price" && !parsed.ok) continue;
      problems.push(`${column(field)}: ${issue.message}`);
    }
  }
  if (problems.length > 0) {
    warnings.push(`${where}: ${kind === "main" ? "main pick" : "alternative"} skipped, incomplete (${problems.join("; ")})`);
    return null;
  }
  if (!raw.image) warnings.push(`${where}: no ${column("image")} yet, using the placeholder`);
  return item;
}

function readPicks(
  rows: string[][],
  altTab: string[][] | null | undefined,
  errors: SheetError[],
  warnings: string[],
  locations: Map<string, SheetLocation>,
): CatalogPick[] {
  const columns = indexHeaders(rows[0]);
  const tierColumn = columns.has("lifestyle") ? "lifestyle" : columns.has("tier") ? "tier" : "";
  const productColumn = columns.has("product") ? "product" : columns.has("category") ? "category" : "";
  if (!tierColumn) errors.push({ tab: "picks", message: 'missing column "lifestyle"' });
  if (!productColumn) errors.push({ tab: "picks", message: 'missing column "product"' });
  requireColumns("picks", columns, PICK_FIELDS, errors);

  type AltCandidate = { tab: string; sheetRow: number; order: number; seq: number; raw: RawItem; prefix: string };
  const picks: CatalogPick[] = [];
  const pickByKey = new Map<string, { index: number; sheetRow: number }>();
  const altsByKey = new Map<string, AltCandidate[]>();
  let seq = 0;
  const addAlt = (key: string, alt: AltCandidate) => {
    const list = altsByKey.get(key) ?? [];
    list.push(alt);
    altsByKey.set(key, list);
  };

  rows.forEach((row, index) => {
    if (index === 0) return;
    const sheetRow = index + 1;
    if (isBlankRow(row) || isCommentRow(row)) return;
    const tier = tierColumn ? cell(row, columns, tierColumn) : "";
    const product = productColumn ? cell(row, columns, productColumn) : "";
    const key = `${tier}\0${product}`;
    const read = (prefix: string): RawItem => ({
      brand: cell(row, columns, `${prefix}_brand`),
      name: cell(row, columns, `${prefix}_name`),
      price: cell(row, columns, `${prefix}_price`),
      currency: cell(row, columns, `${prefix}_currency`),
      url: cell(row, columns, `${prefix}_url`),
      image: cell(row, columns, `${prefix}_image`),
      why: cell(row, columns, `${prefix}_why`),
      when: prefix === "alt" ? cell(row, columns, "alt_when") : "",
    });

    // Legacy: alt_* on the picks row is an alternative with order 0.
    if (columns.has("alt_brand") && !isPlaceholderBrand(cell(row, columns, "alt_brand"))) {
      addAlt(key, { tab: "picks", sheetRow, order: 0, seq: seq++, raw: read("alt"), prefix: "alt_" });
    }

    const mainBrand = cell(row, columns, "main_brand");
    if (isPlaceholderBrand(mainBrand)) return;
    const previous = pickByKey.get(key);
    if (previous) {
      errors.push({
        tab: "picks",
        row: sheetRow,
        column: "main_brand",
        message: `Duplicate pick for ${tier} / ${product} (row ${previous.sheetRow} already has one)`,
      });
      return;
    }
    const main = completeItem(read("main"), "main", `picks, row ${sheetRow}`, (f) => `main_${f}`, warnings);
    // Ids are still checked when the item is incomplete: a bad id is a structural error.
    const catalogIndex = picks.length;
    pickByKey.set(key, { index: main ? catalogIndex : -1, sheetRow });
    if (!main) {
      checkPickIds(tier, product, "picks", sheetRow, tierColumn || "lifestyle", productColumn || "product");
      return;
    }
    for (const field of [[], ["tier"]] as PropertyKey[][]) {
      locations.set(locKey(["picks", catalogIndex, ...field]), { tab: "picks", row: sheetRow, column: tierColumn || "lifestyle" });
    }
    locations.set(locKey(["picks", catalogIndex, "product"]), { tab: "picks", row: sheetRow, column: productColumn || "product" });
    registerItem(locations, ["picks", catalogIndex, "main"], "picks", sheetRow, "main");
    picks.push({ tier, product, main, alts: [] });
  });

  // alternatives tab (optional)
  const altHeader = altTab && altTab.length > 0 ? indexHeaders(altTab[0]) : null;
  if (altHeader && !altHeader.has("product") && !altHeader.has("brand")) {
    // A missing tab can come back as another tab's rows from the gviz export.
    warnings.push('alternatives: tab not found (or no header row); no alternatives read from it');
  } else if (altTab && altHeader) {
    const alt = altHeader;
    const altTier = alt.has("tier") ? "tier" : alt.has("lifestyle") ? "lifestyle" : "";
    if (!altTier) errors.push({ tab: "alternatives", message: 'missing column "tier"' });
    requireColumns("alternatives", alt, ALT_FIELDS, errors);
    altTab.forEach((row, index) => {
      if (index === 0) return;
      const sheetRow = index + 1;
      if (isBlankRow(row) || isCommentRow(row)) return;
      const brand = cell(row, alt, "brand");
      if (isPlaceholderBrand(brand)) return;
      const tier = altTier ? cell(row, alt, altTier) : "";
      const product = cell(row, alt, "product");
      checkPickIds(tier, product, "alternatives", sheetRow, altTier || "tier", "product");
      const rawOrder = cell(row, alt, "order");
      const order = Number(rawOrder);
      if (!/^[1-3]$/.test(rawOrder)) {
        warnings.push(`alternatives, row ${sheetRow}: alternative skipped (order must be 1, 2 or 3, got ${JSON.stringify(rawOrder)})`);
        return;
      }
      addAlt(`${tier}\0${product}`, {
        tab: "alternatives",
        sheetRow,
        order,
        seq: seq++,
        prefix: "",
        raw: {
          brand,
          name: cell(row, alt, "name"),
          price: cell(row, alt, "price"),
          currency: cell(row, alt, "currency"),
          url: cell(row, alt, "url"),
          image: cell(row, alt, "image"),
          why: cell(row, alt, "why"),
          when: cell(row, alt, "alt_when") || cell(row, alt, "when"),
        },
      });
    });
  }

  for (const [key, list] of altsByKey) {
    const [tier, product] = key.split("\0");
    const owner = pickByKey.get(key);
    if (!owner || owner.index < 0) {
      for (const alt of list) {
        if (alt.tab === "alternatives" || owner === undefined) {
          warnings.push(`${alt.tab}, row ${alt.sheetRow}: alternative ignored (no complete main pick for ${tier} / ${product})`);
        }
      }
      continue;
    }
    list.sort((a, b) => a.order - b.order || a.seq - b.seq);
    const target = picks[owner.index];
    for (const candidate of list) {
      const where = `${candidate.tab}, row ${candidate.sheetRow}`;
      if (target.alts.length >= MAX_ALTERNATIVES) {
        warnings.push(`${where}: alternative skipped (at most ${MAX_ALTERNATIVES} per lifestyle and product)`);
        continue;
      }
      const item = completeItem(candidate.raw, "alt", where, (f) => (f === "when" ? "alt_when" : `${candidate.prefix}${f}`), warnings);
      if (!item) continue;
      const altPath: PropertyKey[] = ["picks", owner.index, "alts", target.alts.length];
      for (const field of ["brand", "name", "price", "currency", "url", "image", "why", "when"]) {
        const column = field === "when" ? "alt_when" : `${candidate.prefix}${field}`;
        locations.set(locKey([...altPath, field]), { tab: candidate.tab, row: candidate.sheetRow, column });
      }
      target.alts.push(item);
    }
  }

  return picks;

  // Unknown ids on rows that are otherwise skipped are still structural errors.
  function checkPickIds(tier: string, product: string, tab: string, sheetRow: number, tierCol: string, productCol: string): void {
    pendingIdChecks.push({ tier, product, tab, sheetRow, tierCol, productCol });
  }
}

type PendingIdCheck = { tier: string; product: string; tab: string; sheetRow: number; tierCol: string; productCol: string };
const pendingIdChecks: PendingIdCheck[] = [];

function readSettings(
  rows: string[][] | null | undefined,
  warnings: string[],
  errors: SheetError[],
  locations: Map<string, SheetLocation>,
): CatalogLanding {
  const landing: CatalogLanding = {};
  const miss = (key: "anchorProduct" | "compareProducts") => {
    errors.push({
      tab: "settings",
      message: `missing key ${JSON.stringify(key)}`,
      path: ["landing", key],
    });
  };

  if (!rows || rows.length === 0) {
    miss("anchorProduct");
    miss("compareProducts");
    return landing;
  }

  const columns = indexHeaders(rows[0]);
  if (!columns.has("key") || !columns.has("value")) {
    if (!columns.has("key")) errors.push({ tab: "settings", message: 'missing column "key"' });
    if (!columns.has("value")) errors.push({ tab: "settings", message: 'missing column "value"' });
    miss("anchorProduct");
    miss("compareProducts");
    return landing;
  }

  const hits: Record<"anchorProduct" | "compareProducts", { value: string; row: number }[]> = {
    anchorProduct: [],
    compareProducts: [],
  };

  rows.forEach((row, index) => {
    if (index === 0) return;
    const sheetRow = index + 1;
    if (isBlankRow(row) || isCommentRow(row)) return;
    const key = cell(row, columns, "key");
    const value = cell(row, columns, "value");
    if (!key) return;
    const logical = SETTING_KEYS[key.toLowerCase()];
    if (!logical) {
      if (value) warnings.push(`settings: unknown key ${key} ignored`);
      return;
    }
    hits[logical].push({ value, row: sheetRow });
  });

  const choose = (key: "anchorProduct" | "compareProducts") => {
    const list = hits[key];
    if (list.length === 0) {
      miss(key);
      return undefined;
    }
    return list.find((hit) => hit.value !== "") ?? list[0];
  };

  const anchor = choose("anchorProduct");
  if (anchor) {
    locations.set(locKey(["landing", "anchorProduct"]), {
      tab: "settings",
      row: anchor.row,
      column: "value",
    });
    if (anchor.value) landing.anchorProduct = anchor.value;
  }

  const compare = choose("compareProducts");
  if (compare) {
    const base = { tab: "settings", row: compare.row, column: "value" };
    locations.set(locKey(["landing", "compareProducts"]), base);
    if (compare.value) {
      const ids = splitList(compare.value);
      landing.compareProducts = ids;
      ids.forEach((_, itemIndex) => {
        locations.set(locKey(["landing", "compareProducts", itemIndex]), base);
      });
    }
  }

  return landing;
}

function lookupLocation(
  locations: Map<string, SheetLocation>,
  path: PropertyKey[],
): SheetLocation | undefined {
  for (let length = path.length; length >= 0; length -= 1) {
    const found = locations.get(locKey(path.slice(0, length)));
    if (found) return found;
  }
  return undefined;
}

/** Rewrite schema index references ("also at picks[0]") into sheet row numbers. */
function sheetize(message: string, locations: Map<string, SheetLocation>): string {
  const withIds = message.replace(
    /\(also at (tiers|categories|products)\[(\d+)\]\.id\)/g,
    (full, key: string, index: string) => {
      const row = locations.get(locKey([key, Number(index), "id"]))?.row;
      return row != null ? `(also row ${row})` : full;
    },
  );
  return withIds.replace(/\(also at picks\[(\d+)\]\)/g, (full, index: string) => {
    const row = locations.get(locKey(["picks", Number(index)]))?.row;
    return row != null ? `(also row ${row})` : full;
  });
}

function attachReferenceErrors(
  catalog: CatalogShape,
  errors: SheetError[],
  locations: Map<string, SheetLocation>,
  lifestylesTab: string,
): void {
  for (const issue of referenceIssues(catalog)) {
    const exact = locations.get(locKey(issue.path));
    const location = lookupLocation(locations, issue.path);
    const row = exact?.row ?? location?.row;
    const column = exact?.column ?? (row != null ? location?.column : undefined);
    errors.push({
      tab: exact?.tab ?? location?.tab ?? lifestylesTab,
      row,
      column,
      message: sheetize(issue.message, locations),
      path: issue.path,
    });
  }
}

export function catalogToSheet(catalog: CatalogShape): SheetRows {
  const lifestyles: string[][] = [[...LIFESTYLE_HEADER]];
  for (const tier of catalog.tiers) {
    lifestyles.push([
      tier.id ?? "",
      tier.name ?? "",
      tier.description ?? "",
      tier.status ?? "",
      joinList(tier.exampleBrands),
      tier.accent ?? "",
      tier.group ?? "",
      tier.basedOn ?? "",
      tier.whoFor ?? "",
      joinList(tier.brandChips),
    ]);
  }

  const categories: string[][] = [["id", "name", "order", "description"]];
  for (const category of catalog.categories) {
    categories.push([
      category.id,
      category.name,
      String(category.order),
      category.description ?? "",
    ]);
  }

  const products: string[][] = [["id", "name", "primaryCategory", "categories", "order"]];
  for (const product of catalog.products) {
    products.push([
      product.id,
      product.name,
      product.primaryCategory,
      joinList(product.categories),
      String(product.order),
    ]);
  }

  const picks: string[][] = [
    ["lifestyle", "product", "main_brand", "main_name", "main_price", "main_currency", "main_url", "main_image", "main_why"],
  ];
  const alternatives: string[][] = [
    ["tier", "product", "order", "brand", "name", "price", "currency", "url", "image", "alt_when", "price_checked"],
  ];
  for (const pick of catalog.picks) {
    picks.push([
      pick.tier,
      pick.product,
      pick.main.brand,
      pick.main.name,
      String(pick.main.price),
      pick.main.currency,
      pick.main.url,
      pick.main.image,
      pick.main.why ?? "",
    ]);
    (pick.alts ?? []).forEach((alt, index) => {
      alternatives.push([
        pick.tier,
        pick.product,
        String(index + 1),
        alt.brand,
        alt.name,
        String(alt.price),
        alt.currency,
        alt.url,
        alt.image,
        alt.when ?? "",
        "",
      ]);
    });
  }

  const landing = catalog.landing ?? {};
  const settings: string[][] = [
    ["key", "value", "notes"],
    [
      "anchorProduct",
      landing.anchorProduct ?? "",
      "Product id featured first on the homepage.",
    ],
    [
      "compareProducts",
      joinList(landing.compareProducts),
      "Comma-separated product ids shown in the homepage comparison strip.",
    ],
  ];

  return { lifestyles, categories, products, picks, alternatives, settings };
}

function valueAt(root: unknown, path: PropertyKey[]): unknown {
  let current: unknown = root;
  for (const segment of path) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<PropertyKey, unknown>)[segment];
  }
  return current;
}

function unrecognizedKeys(message: string): string[] | null {
  const match = /^Unrecognized key\(s\) in object: (.*)$/.exec(message);
  if (!match) return null;
  return [...match[1].matchAll(/'([^']*)'/g)].map((found) => found[1] ?? "");
}

function withLength(message: string, value: unknown): string {
  if (typeof value !== "string") return message;
  const custom =
    message === "Expected at most 90 characters" || message === "Expected at most 140 characters";
  const zodDefault = /^String must contain at most (90|140) character/.test(message);
  if (!custom && !zodDefault) return message;
  const label = message.includes("140") || zodDefault && message.includes("140")
    ? "Expected at most 140 characters"
    : message.includes("90")
      ? "Expected at most 90 characters"
      : message;
  if (label.startsWith("Expected at most")) return `${label} (you have ${value.length})`;
  return message;
}

type SortableLine = { tab: string; row: number; column: string; text: string };

function formatLocationLine(
  tab: string,
  row: number | undefined,
  column: string | undefined,
  message: string,
): string {
  if (row != null && column) return `${tab}, row ${row}, column ${column}: ${message}`;
  if (row != null) return `${tab}, row ${row}: ${message}`;
  if (tab) return `${tab}: ${message}`;
  return message;
}

function lineFromConverterError(error: SheetError): SortableLine {
  if (!error.tab) {
    return {
      tab: "",
      row: Number.POSITIVE_INFINITY,
      column: "",
      text: `catalog path ${formatIssuePath(error.path ?? [])}: ${error.message}`,
    };
  }
  return {
    tab: error.tab,
    row: error.row ?? Number.POSITIVE_INFINITY,
    column: error.column ?? "",
    text: formatLocationLine(error.tab, error.row, error.column, error.message),
  };
}

function lineFromSchemaIssue(issue: CatalogIssue, result: ConvertResult): SortableLine {
  const keys = unrecognizedKeys(issue.message);
  const location = lookupLocation(result.locations, issue.path);
  const exact = result.locations.get(locKey(issue.path));

  if (keys) {
    const joined = keys.join(", ");
    const phrase = `column(s) ${joined} ${UNSUPPORTED}`;
    if (location?.tab && location.row != null) {
      return {
        tab: location.tab,
        row: location.row,
        column: joined,
        text: `${location.tab}, row ${location.row}: ${phrase}`,
      };
    }
    const tab = location?.tab ?? "";
    return {
      tab,
      row: location?.row ?? Number.POSITIVE_INFINITY,
      column: joined,
      text: tab
        ? `${tab}: ${phrase}`
        : `catalog path ${formatIssuePath(issue.path)}: ${phrase}`,
    };
  }

  const message = withLength(sheetize(issue.message, result.locations), valueAt(result.catalog, issue.path));
  const field = issue.path[1];
  if (
    issue.message === "Required" &&
    issue.path[0] === "landing" &&
    (field === "anchorProduct" || field === "compareProducts") &&
    exact?.row == null
  ) {
    return {
      tab: "settings",
      row: Number.POSITIVE_INFINITY,
      column: "",
      text: `settings: missing key ${JSON.stringify(String(field))}`,
    };
  }

  const tab = exact?.tab ?? location?.tab ?? "";
  if (!tab) {
    return {
      tab: "",
      row: Number.POSITIVE_INFINITY,
      column: "",
      text: `catalog path ${formatIssuePath(issue.path)}: ${message}`,
    };
  }
  const column = exact?.column ?? (location?.row != null ? location.column : undefined);
  const row = exact?.row ?? location?.row;
  return {
    tab,
    row: row ?? Number.POSITIVE_INFINITY,
    column: column ?? "",
    text: formatLocationLine(tab, row, column, message),
  };
}

/** Merge converter errors with schema issues, dedupe, and sort by tab then row. */
export function formatSheetProblems(result: ConvertResult, schemaIssues: CatalogIssue[]): string {
  const covered = new Set(
    result.errors.filter((error) => error.path && error.path.length > 0).map((error) => locKey(error.path!)),
  );
  const lines: SortableLine[] = [];
  for (const error of result.errors) lines.push(lineFromConverterError(error));
  for (const issue of schemaIssues) {
    if (covered.has(locKey(issue.path))) continue;
    lines.push(lineFromSchemaIssue(issue, result));
  }

  const seen = new Set<string>();
  const unique = lines.filter((line) => {
    if (seen.has(line.text)) return false;
    seen.add(line.text);
    return true;
  });

  unique.sort((a, b) => {
    const tab = (TAB_RANK[a.tab] ?? 99) - (TAB_RANK[b.tab] ?? 99);
    if (tab !== 0) return tab;
    if (a.row !== b.row) return a.row - b.row;
    if (a.column !== b.column) return a.column.localeCompare(b.column);
    return a.text.localeCompare(b.text);
  });

  if (unique.length === 0) return "";
  const noun = unique.length === 1 ? "problem" : "problems";
  return `The sheet has ${unique.length} ${noun}:\n${unique.map((line) => `  - ${line.text}`).join("\n")}`;
}
