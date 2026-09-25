import { z } from "zod";

const slug = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Expected a lowercase slug (letters, numbers, and hyphens)",
  );

const text = z.string().trim().min(1, "Required");

const currency = z
  .string()
  .regex(/^[A-Z]{3}$/, "Expected a 3-letter ISO currency code")
  .refine((code) => {
    try {
      new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(0);
      return true;
    } catch {
      return false;
    }
  }, "Expected a valid ISO currency code");

const imagePath = z
  .string()
  .min(1, "Required")
  .regex(/^\/images\/[A-Za-z0-9._/-]+$/, "Expected an image path starting with /images/")
  .refine((value) => !value.includes(".."), "Expected an image path without '..'");

const productSchema = z.object({
  brand: text,
  name: text,
  price: z
    .number()
    .refine((value) => Number.isFinite(value), "Expected a finite number")
    .refine((value) => value >= 0, "Expected a number greater than or equal to 0"),
  currency,
  url: text,
  image: imagePath,
  why: text.max(90, "Expected at most 90 characters"),
});

const altSchema = productSchema.extend({
  when: text.max(90, "Expected at most 90 characters"),
});

const tierSchema = z.object({
  id: slug,
  name: text,
  description: text,
  exampleBrands: z.array(text),
  status: z.enum(["live", "coming_soon"]),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Expected a hex color like #10B981"),
});

const categorySchema = z.object({
  id: slug,
  name: text,
  section: text,
});

const pickSchema = z.object({
  tier: text,
  category: text,
  main: productSchema,
  alt: altSchema,
});

export const catalogSchema = z.object({
  tiers: z.array(tierSchema).min(1, "Expected at least one tier"),
  sections: z.array(text).min(1, "Expected at least one section"),
  categories: z.array(categorySchema),
  picks: z.array(pickSchema),
});

export type CatalogIssue = { path: PropertyKey[]; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim();
}

/** Exact "TODO", or a curator note that starts with "TODO:". Not "Todo Wool Tee". */
export function isUnfinishedCopy(value: string): boolean {
  const upper = value.trim().toUpperCase();
  return upper === "TODO" || upper.startsWith("TODO:");
}

/** Blank, or the exact word TODO. "Todo Wool Tee" is a real brand. */
export function isPlaceholderBrand(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed.toUpperCase() === "TODO";
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Reference checks run even when other fields have the wrong type. */
export function referenceIssues(data: unknown): CatalogIssue[] {
  if (!isRecord(data)) return [];
  const issues: CatalogIssue[] = [];
  const tiers = Array.isArray(data.tiers) ? data.tiers : [];
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const picks = Array.isArray(data.picks) ? data.picks : [];

  const tierIds = new Map<string, number>();
  tiers.forEach((tier, index) => {
    if (!isRecord(tier) || typeof tier.id !== "string" || tier.id.length === 0) return;
    // Slugs are not trimmed. A whitespace id stays invalid and fails the slug regex.
    const id = tier.id;
    const previous = tierIds.get(id);
    if (previous !== undefined) {
      issues.push({
        path: ["tiers", index, "id"],
        message: `Duplicate tier id ${JSON.stringify(id)} (also at tiers[${previous}].id)`,
      });
    } else {
      tierIds.set(id, index);
    }
  });

  const sectionNames = new Map<string, number>();
  sections.forEach((section, index) => {
    if (typeof section !== "string") return;
    const name = section.trim();
    if (!name) return;
    const previous = sectionNames.get(name);
    if (previous !== undefined) {
      issues.push({
        path: ["sections", index],
        message: `Duplicate section ${JSON.stringify(name)} (also at sections[${previous}])`,
      });
    } else {
      sectionNames.set(name, index);
    }
  });

  const categoryIds = new Map<string, number>();
  categories.forEach((category, index) => {
    if (!isRecord(category)) return;
    if (typeof category.id === "string" && category.id.length > 0) {
      const id = category.id;
      const previous = categoryIds.get(id);
      if (previous !== undefined) {
        issues.push({
          path: ["categories", index, "id"],
          message: `Duplicate category id ${JSON.stringify(id)} (also at categories[${previous}].id)`,
        });
      } else {
        categoryIds.set(id, index);
      }
    }
    if (typeof category.section === "string" && category.section.trim() && !sectionNames.has(category.section.trim())) {
      issues.push({
        path: ["categories", index, "section"],
        message: `Unknown section ${JSON.stringify(category.section.trim())}`,
      });
    }
  });

  const pickKeys = new Map<string, number>();
  picks.forEach((pick, index) => {
    if (!isRecord(pick)) return;
    const tier = typeof pick.tier === "string" ? pick.tier.trim() : null;
    const category = typeof pick.category === "string" ? pick.category.trim() : null;
    if (tier && !tierIds.has(tier)) {
      issues.push({
        path: ["picks", index, "tier"],
        message: `Unknown tier ${JSON.stringify(tier)}`,
      });
    }
    if (category && !categoryIds.has(category)) {
      issues.push({
        path: ["picks", index, "category"],
        message: `Unknown category ${JSON.stringify(category)}`,
      });
    }
    if (tier && category) {
      const key = `${tier}::${category}`;
      const previous = pickKeys.get(key);
      if (previous !== undefined) {
        issues.push({
          path: ["picks", index],
          message: `Duplicate pick for tier ${JSON.stringify(tier)} and category ${JSON.stringify(category)} (also at picks[${previous}])`,
        });
      } else {
        pickKeys.set(key, index);
      }
    }
  });

  return issues;
}

function productContentIssues(
  product: unknown,
  path: PropertyKey[],
  issues: CatalogIssue[],
  fields: ("name" | "why" | "when")[],
): { brand: string | null; currency: string | null; real: boolean } {
  if (!isRecord(product)) return { brand: null, currency: null, real: false };
  const brand = trimmedString(product.brand);
  const real = brand != null && !isPlaceholderBrand(brand);
  if (real) {
    for (const field of fields) {
      const value = trimmedString(product[field]);
      if (value != null && isUnfinishedCopy(value)) {
        issues.push({
          path: [...path, field],
          message: "is still TODO but brand is set",
        });
      }
    }
  }
  const url = trimmedString(product.url);
  if (url && !isHttpUrl(url)) {
    issues.push({
      path: [...path, "url"],
      message: "Expected an http(s) URL",
    });
  }
  const currencyCode = trimmedString(product.currency);
  return { brand, currency: currencyCode, real };
}

/** Cross-field checks that must surface beside type errors. */
export function contentIssues(data: unknown): CatalogIssue[] {
  if (!isRecord(data) || !Array.isArray(data.picks)) return [];
  const issues: CatalogIssue[] = [];
  const byTier = new Map<string, Set<string>>();

  data.picks.forEach((pick, index) => {
    if (!isRecord(pick)) return;
    const main = productContentIssues(pick.main, ["picks", index, "main"], issues, ["name", "why"]);
    productContentIssues(pick.alt, ["picks", index, "alt"], issues, ["name", "why", "when"]);
    if (!main.real || !main.currency) return;
    const tier = trimmedString(pick.tier);
    if (!tier) return;
    const codes = byTier.get(tier) ?? new Set<string>();
    codes.add(main.currency);
    byTier.set(tier, codes);
  });

  for (const [tier, codes] of byTier) {
    if (codes.size < 2) continue;
    issues.push({
      path: ["picks"],
      message: `Tier ${JSON.stringify(tier)} uses more than one currency (${[...codes].sort((a, b) => a.localeCompare(b)).join(", ")})`,
    });
  }

  return issues;
}

export function collectCatalogIssues(data: unknown, extras: CatalogIssue[] = []): CatalogIssue[] {
  const result = catalogSchema.safeParse(data);
  const issues: CatalogIssue[] = [];
  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push({ path: issue.path, message: issue.message });
    }
  }
  issues.push(...referenceIssues(data));
  issues.push(...contentIssues(data));
  issues.push(...extras);
  return issues;
}

export type Catalog = z.infer<typeof catalogSchema>;
export type Tier = Catalog["tiers"][number];
export type Category = Catalog["categories"][number];
export type CatalogPick = Catalog["picks"][number];
export type Product = CatalogPick["main"];
export type AltProduct = CatalogPick["alt"];

export function formatIssuePath(path: PropertyKey[]): string {
  if (path.length === 0) return "(root)";
  let out = "";
  for (const segment of path) {
    if (typeof segment === "number") {
      out += `[${segment}]`;
    } else {
      const key = String(segment);
      out = out.length === 0 ? key : `${out}.${key}`;
    }
  }
  return out;
}

export function formatCatalogError(issues: CatalogIssue[]): string {
  const lines = issues.map((issue) => `  - ${formatIssuePath(issue.path)}: ${issue.message}`);
  return `catalog.json is invalid:\n${lines.join("\n")}`;
}

export function parseCatalog(data: unknown, extras: CatalogIssue[] = []): Catalog {
  const issues = collectCatalogIssues(data, extras);
  if (issues.length > 0) {
    throw new Error(formatCatalogError(issues));
  }
  const result = catalogSchema.safeParse(data);
  if (!result.success) {
    throw new Error(formatCatalogError(collectCatalogIssues(data, extras)));
  }
  return result.data;
}
