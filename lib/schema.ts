import { z } from "zod";
import { isBuyableUrl, isHttpUrl, isPlaceholderBrand, isUnfinishedCopy } from "./copy";
import { sectionHeadingId } from "./section-id";

const slug = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Expected a lowercase slug (letters, numbers, and hyphens)",
  );

const text = z.string().trim().min(1, "Required");

const singleLine = text
  .max(90, "Expected at most 90 characters")
  .refine((value) => !/[\r\n]/.test(value), "Expected a single line");

const currency = z
  .string()
  .regex(/^[A-Z]{3}$/, "Expected a 3-letter ISO currency code")
  .refine((code) => {
    try {
      return Intl.supportedValuesOf("currency").includes(code);
    } catch {
      return false;
    }
  }, "Expected a valid ISO currency code");

const imagePath = z
  .string()
  .min(1, "Required")
  .regex(/^\/images\/[A-Za-z0-9._/-]+$/, "Expected an image path starting with /images/")
  .refine((value) => !value.includes(".."), "Expected an image path without '..'");

function priceIssue(value: number): string | null {
  if (!Number.isFinite(value)) return "Expected a finite number";
  if (Object.is(value, -0)) return "Signed zero is not a valid price";
  if (value < 0) return "Expected a number greater than or equal to 0";
  const scaled = value * 100;
  const cents = Math.round(scaled);
  if (Math.abs(scaled - cents) > 1e-6) return "Expected a price with at most 2 decimal places";
  return null;
}

const price = z.number().superRefine((value, ctx) => {
  const message = priceIssue(value);
  if (!message) return;
  ctx.addIssue({ code: z.ZodIssueCode.custom, message });
});

const productSchema = z
  .object({
    brand: text,
    name: text,
    price,
    currency,
    url: text,
    image: imagePath,
    why: singleLine,
  })
  .strict();

const altSchema = productSchema
  .extend({
    when: singleLine,
  })
  .strict();

const whoFor = z
  .string()
  .trim()
  .min(1, "Required")
  .max(140, "Expected at most 140 characters")
  .refine((value) => !/[\r\n]/.test(value), "Expected a single line");

const tierSchema = z
  .object({
    id: slug,
    name: text,
    description: text,
    whoFor: whoFor.optional(),
    exampleBrands: z.array(text),
    brandChips: z.array(text).optional(),
    status: z.enum(["live", "coming_soon"]),
    /** Another tier id this lifestyle inherits empty categories from. Optional. */
    basedOn: slug.optional(),
    /** Landing and switcher placement. Omitted means primary. */
    group: z.enum(["primary", "secondary"]).default("primary"),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Expected a hex color like #10B981"),
  })
  .strict();

const landingSchema = z
  .object({
    anchorCategory: slug,
    compareCategories: z.array(slug).min(1, "Expected at least one category"),
  })
  .strict();

const categorySchema = z
  .object({
    id: slug,
    name: text,
    section: text,
  })
  .strict();

const pickSchema = z
  .object({
    tier: text,
    category: text,
    main: productSchema,
    alt: altSchema,
  })
  .strict();

export const catalogSchema = z
  .object({
    tiers: z.array(tierSchema).min(1, "Expected at least one tier"),
    sections: z.array(text).min(1, "Expected at least one section"),
    categories: z.array(categorySchema),
    landing: landingSchema,
    picks: z.array(pickSchema),
  })
  .strict();

export type CatalogIssue = { path: PropertyKey[]; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim();
}

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

  issues.push(...basedOnIssues(tiers, tierIds));

  const sectionExact = new Map<string, number>();
  const sectionFold = new Map<string, number>();
  const headingIds = new Map<string, number>();
  sections.forEach((section, index) => {
    if (typeof section !== "string") return;
    const name = section.trim();
    if (!name) return;
    const fold = name.toLowerCase();
    const exactPrevious = sectionExact.get(name);
    const foldPrevious = sectionFold.get(fold);
    const previous = exactPrevious ?? foldPrevious;
    if (previous !== undefined) {
      issues.push({
        path: ["sections", index],
        message: `Duplicate section ${JSON.stringify(name)} (also at sections[${previous}])`,
      });
    } else {
      sectionExact.set(name, index);
      sectionFold.set(fold, index);
    }
    const headingId = sectionHeadingId(index);
    const idPrevious = headingIds.get(headingId);
    if (idPrevious !== undefined) {
      issues.push({
        path: ["sections", index],
        message: `Duplicate section heading id ${JSON.stringify(headingId)} (also at sections[${idPrevious}])`,
      });
    } else {
      headingIds.set(headingId, index);
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
    if (typeof category.section === "string" && category.section.trim() && !sectionExact.has(category.section.trim())) {
      issues.push({
        path: ["categories", index, "section"],
        message: `Unknown section ${JSON.stringify(category.section.trim())}`,
      });
    }
  });

  const landing = data.landing;
  if (isRecord(landing)) {
    const anchor = typeof landing.anchorCategory === "string" ? landing.anchorCategory : null;
    if (anchor && !categoryIds.has(anchor)) {
      issues.push({
        path: ["landing", "anchorCategory"],
        message: `Unknown category ${JSON.stringify(anchor)}`,
      });
    }
    if (Array.isArray(landing.compareCategories)) {
      const seen = new Map<string, number>();
      landing.compareCategories.forEach((value, index) => {
        if (typeof value !== "string" || value.length === 0) return;
        if (!categoryIds.has(value)) {
          issues.push({
            path: ["landing", "compareCategories", index],
            message: `Unknown category ${JSON.stringify(value)}`,
          });
        }
        const previous = seen.get(value);
        if (previous !== undefined) {
          issues.push({
            path: ["landing", "compareCategories", index],
            message: `Duplicate category ${JSON.stringify(value)} (also at landing.compareCategories[${previous}])`,
          });
        } else {
          seen.set(value, index);
        }
      });
    }
  }

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

/**
 * `basedOn` must name another tier, never itself, and must not cycle.
 * A cycle is reported from each lifestyle that participates, with the walk
 * that returns to a repeated id: `cycle organic → mid → organic`.
 */
function basedOnIssues(tiers: unknown[], tierIds: Map<string, number>): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const basedOnOf = new Map<string, string>();

  tiers.forEach((tier, index) => {
    if (!isRecord(tier) || typeof tier.id !== "string" || tier.id.length === 0) return;
    if (!Object.prototype.hasOwnProperty.call(tier, "basedOn")) return;
    const basedOn = tier.basedOn;
    if (typeof basedOn !== "string" || basedOn.length === 0) return;
    if (!tierIds.has(basedOn)) {
      issues.push({
        path: ["tiers", index, "basedOn"],
        message: `Unknown tier ${JSON.stringify(basedOn)}`,
      });
      return;
    }
    if (basedOn === tier.id) {
      issues.push({
        path: ["tiers", index, "basedOn"],
        message: "cannot reference itself",
      });
      return;
    }
    basedOnOf.set(tier.id, basedOn);
  });

  for (const start of basedOnOf.keys()) {
    const path = [start];
    const seen = new Set<string>([start]);
    let current = basedOnOf.get(start);
    while (current) {
      path.push(current);
      if (seen.has(current)) {
        const cycleStart = path.indexOf(current);
        const cycle = path.slice(cycleStart);
        const index = tierIds.get(start);
        if (index !== undefined) {
          issues.push({
            path: ["tiers", index, "basedOn"],
            message: `cycle ${cycle.join(" → ")}`,
          });
        }
        break;
      }
      seen.add(current);
      current = basedOnOf.get(current);
    }
  }

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
  } else if (real && url && !isBuyableUrl(url)) {
    issues.push({
      path: [...path, "url"],
      message: "Expected a retailer http(s) URL",
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
    const alt = productContentIssues(pick.alt, ["picks", index, "alt"], issues, ["name", "why", "when"]);
    if (alt.real && !main.real) {
      issues.push({
        path: ["picks", index, "alt", "brand"],
        message: "alternative is set while the main brand is still TODO",
      });
    }
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
