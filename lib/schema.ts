/**
 * catalog.json v2 schema (tags + product types). Mirrors lifestyles-sheets/lib/schema-v2.ts exactly
 * (CONTRACT.md), so the sheet converter output drops straight in.
 */
import { z } from "zod";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CatalogIssue = { path: PropertyKey[]; message: string };

export const FEATURED_PRIMARY_MESSAGE = "Featured can't be a primary category";

const slug = z.string().trim().superRefine((value, ctx) => {
  if (value.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required" });
    return;
  }
  if (!SLUG_RE.test(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Expected a lowercase slug (letters, numbers, and hyphens)",
    });
  }
});

const text = z.string().trim().min(1, "Required");

const singleLine = text
  .max(90, "Expected at most 90 characters")
  .refine((value) => !/[\r\n]/.test(value), "Expected a single line");

const whoForText = text
  .max(140, "Expected at most 140 characters")
  .refine((value) => !/[\r\n]/.test(value), "Expected a single line");

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

const currency = z.string().trim().superRefine((value, ctx) => {
  if (value.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required" });
    return;
  }
  if (!/^[A-Z]{3}$/.test(value)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Expected a 3-letter currency code" });
  }
});

const imagePath = z.string().trim().superRefine((value, ctx) => {
  if (value.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required" });
    return;
  }
  if (!/^\/images\/[A-Za-z0-9._/-]+$/.test(value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Expected an image path starting with /images/",
    });
  }
});

const order = z.number().int("Expected a whole number");

const tierSchema = z
  .object({
    id: slug,
    name: text,
    description: text,
    whoFor: whoForText.optional(),
    exampleBrands: z.array(text),
    brandChips: z.array(text).optional(),
    status: z.enum(["live", "coming_soon"], {
      errorMap: () => ({ message: "Expected live or coming_soon" }),
    }),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Expected a hex color like #10B981"),
    group: z
      .enum(["primary", "secondary"], {
        errorMap: () => ({ message: "Expected primary or secondary" }),
      })
      .optional(),
    basedOn: slug.optional(),
  })
  .strict();

const categorySchema = z
  .object({
    id: slug,
    name: text,
    order,
    description: text.optional(),
  })
  .strict();

const productSchema = z
  .object({
    id: slug,
    name: text,
    primaryCategory: slug,
    categories: z.array(slug).min(1, "Expected at least one category"),
    order,
  })
  .strict();

const itemSchema = z
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

const altSchema = itemSchema
  .extend({
    when: singleLine,
  })
  .strict();

const pickSchema = z
  .object({
    tier: slug,
    product: slug,
    main: itemSchema,
    alt: altSchema,
  })
  .strict();

const landingSchema = z
  .object({
    anchorProduct: slug,
    compareProducts: z.array(slug).min(1, "Expected at least one product"),
  })
  .strict();

export const catalogSchema = z
  .object({
    tiers: z.array(tierSchema).min(1, "Expected at least one tier"),
    categories: z.array(categorySchema).min(1, "Expected at least one category"),
    products: z.array(productSchema),
    landing: landingSchema,
    picks: z.array(pickSchema),
  })
  .strict();

export type Catalog = z.infer<typeof catalogSchema>;
export type Tier = Catalog["tiers"][number];
export type Category = Catalog["categories"][number];
export type ProductType = Catalog["products"][number];
export type CatalogPick = Catalog["picks"][number];
export type Item = CatalogPick["main"];
export type AltItem = CatalogPick["alt"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function trimmed(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const textValue = value.trim();
  return textValue.length > 0 ? textValue : null;
}

export function unknownCategoryMessage(id: string, known: readonly string[]): string {
  return `Unknown category ${JSON.stringify(id)} (known: ${known.join(", ")})`;
}

export function unknownProductMessage(id: string): string {
  return `Unknown product ${JSON.stringify(id)}`;
}

export function unknownLifestyleMessage(id: string): string {
  return `Unknown lifestyle ${JSON.stringify(id)}`;
}

/**
 * basedOn must name another lifestyle. Self-links and cycles are reported on the
 * earliest tier in the cycle (the one that appears first in `tiers`).
 */
export function basedOnIssues(data: unknown): CatalogIssue[] {
  if (!isRecord(data) || !Array.isArray(data.tiers)) return [];
  const tiers = data.tiers;
  const issues: CatalogIssue[] = [];
  const idAt = new Map<string, number>();

  tiers.forEach((tier, index) => {
    if (!isRecord(tier) || typeof tier.id !== "string" || tier.id.length === 0) return;
    if (!idAt.has(tier.id)) idAt.set(tier.id, index);
  });

  const basedOnAt = (index: number): string | null => {
    const tier = tiers[index];
    if (!isRecord(tier)) return null;
    return trimmed(tier.basedOn);
  };

  tiers.forEach((tier, index) => {
    if (!isRecord(tier)) return;
    const basedOn = basedOnAt(index);
    if (!basedOn) return;
    const id = typeof tier.id === "string" ? tier.id : "";
    if (id && basedOn === id) {
      issues.push({
        path: ["tiers", index, "basedOn"],
        message: "Lifestyle cannot be based on itself",
      });
      return;
    }
    if (!idAt.has(basedOn)) {
      issues.push({
        path: ["tiers", index, "basedOn"],
        message: unknownLifestyleMessage(basedOn),
      });
    }
  });

  const reported = new Set<string>();
  for (let start = 0; start < tiers.length; start += 1) {
    const startTier = tiers[start];
    if (!isRecord(startTier) || typeof startTier.id !== "string" || startTier.id.length === 0) continue;
    const firstHop = basedOnAt(start);
    if (!firstHop || firstHop === startTier.id || !idAt.has(firstHop)) continue;

    const pathIds = [startTier.id];
    const seen = new Map<string, number>([[startTier.id, 0]]);
    let cursor: string | null = firstHop;
    let guard = 0;
    while (cursor && guard < tiers.length + 1) {
      guard += 1;
      if (seen.has(cursor)) {
        const cycle = pathIds.slice(seen.get(cursor)!);
        const canonical = [...cycle].sort().join("\0");
        if (!reported.has(canonical)) {
          reported.add(canonical);
          let firstId = cycle[0]!;
          let firstIndex = idAt.get(firstId)!;
          for (const id of cycle) {
            const index = idAt.get(id)!;
            if (index < firstIndex) {
              firstIndex = index;
              firstId = id;
            }
          }
          const rotation = cycle.indexOf(firstId);
          const rotated = cycle.slice(rotation).concat(cycle.slice(0, rotation));
          issues.push({
            path: ["tiers", firstIndex, "basedOn"],
            message: `basedOn cycle: ${rotated.join(" -> ")} -> ${firstId}`,
          });
        }
        break;
      }
      const index = idAt.get(cursor);
      if (index === undefined) break;
      const next = basedOnAt(index);
      pathIds.push(cursor);
      seen.set(cursor, pathIds.length - 1);
      if (!next || next === cursor) break;
      cursor = next;
    }
  }

  return issues;
}

function duplicateId(
  issues: CatalogIssue[],
  items: unknown[],
  key: "tiers" | "categories" | "products",
  label: string,
): Map<string, number> {
  const firstIndex = new Map<string, number>();
  items.forEach((item, index) => {
    if (!isRecord(item) || typeof item.id !== "string" || item.id.length === 0) return;
    const previous = firstIndex.get(item.id);
    if (previous !== undefined) {
      issues.push({
        path: [key, index, "id"],
        message: `Duplicate ${label} id ${JSON.stringify(item.id)} (also at ${key}[${previous}].id)`,
      });
    } else {
      firstIndex.set(item.id, index);
    }
  });
  return firstIndex;
}

/** Cross-references: ids, tags, featured, landing, picks, basedOn. */
export function referenceIssues(data: unknown): CatalogIssue[] {
  if (!isRecord(data)) return [];
  const issues: CatalogIssue[] = [];
  const tiers = Array.isArray(data.tiers) ? data.tiers : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const products = Array.isArray(data.products) ? data.products : [];
  const picks = Array.isArray(data.picks) ? data.picks : [];

  const tierIds = duplicateId(issues, tiers, "tiers", "lifestyle");
  const categoryFirst = duplicateId(issues, categories, "categories", "category");
  const productIds = duplicateId(issues, products, "products", "product");
  const knownCategories = [...categoryFirst.keys()];
  const categoryIds = new Set(knownCategories);

  products.forEach((product, index) => {
    if (!isRecord(product)) return;
    const primary = typeof product.primaryCategory === "string" ? product.primaryCategory : "";
    if (primary === "featured") {
      issues.push({
        path: ["products", index, "primaryCategory"],
        message: FEATURED_PRIMARY_MESSAGE,
      });
    } else if (primary && !categoryIds.has(primary)) {
      issues.push({
        path: ["products", index, "primaryCategory"],
        message: unknownCategoryMessage(primary, knownCategories),
      });
    }
    if (!Array.isArray(product.categories)) return;
    const seen = new Set<string>();
    let containsPrimary = false;
    product.categories.forEach((value, categoryIndex) => {
      if (typeof value !== "string" || value.length === 0) return;
      if (value === primary) containsPrimary = true;
      if (seen.has(value)) {
        issues.push({
          path: ["products", index, "categories", categoryIndex],
          message: `Duplicate category ${JSON.stringify(value)}`,
        });
      } else {
        seen.add(value);
      }
      if (!categoryIds.has(value)) {
        issues.push({
          path: ["products", index, "categories", categoryIndex],
          message: unknownCategoryMessage(value, knownCategories),
        });
      }
    });
    if (primary && !containsPrimary) {
      issues.push({
        path: ["products", index, "categories"],
        message: "categories must include primaryCategory",
      });
    }
  });

  const landing = data.landing;
  if (isRecord(landing)) {
    const anchor = typeof landing.anchorProduct === "string" ? landing.anchorProduct : "";
    if (anchor && !productIds.has(anchor)) {
      issues.push({
        path: ["landing", "anchorProduct"],
        message: unknownProductMessage(anchor),
      });
    }
    if (Array.isArray(landing.compareProducts)) {
      landing.compareProducts.forEach((value, index) => {
        if (typeof value !== "string" || value.length === 0) return;
        if (!productIds.has(value)) {
          issues.push({
            path: ["landing", "compareProducts", index],
            message: unknownProductMessage(value),
          });
        }
      });
    }
  }

  const pickKeys = new Map<string, number>();
  picks.forEach((pick, index) => {
    if (!isRecord(pick)) return;
    const tier = typeof pick.tier === "string" ? pick.tier : "";
    const product = typeof pick.product === "string" ? pick.product : "";
    if (tier && !tierIds.has(tier)) {
      issues.push({
        path: ["picks", index, "tier"],
        message: unknownLifestyleMessage(tier),
      });
    }
    if (product && !productIds.has(product)) {
      issues.push({
        path: ["picks", index, "product"],
        message: unknownProductMessage(product),
      });
    }
    if (tier && product) {
      const key = `${tier}\0${product}`;
      const previous = pickKeys.get(key);
      if (previous !== undefined) {
        issues.push({
          path: ["picks", index],
          message: `Duplicate pick for lifestyle ${JSON.stringify(tier)} and product ${JSON.stringify(product)} (also at picks[${previous}])`,
        });
      } else {
        pickKeys.set(key, index);
      }
    }
  });

  issues.push(...basedOnIssues(data));
  return issues;
}

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

function dedupeIssues(issues: CatalogIssue[]): CatalogIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${JSON.stringify(issue.path)}\0${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function collectCatalogIssues(data: unknown, extras: CatalogIssue[] = []): CatalogIssue[] {
  const issues: CatalogIssue[] = [];
  const result = catalogSchema.safeParse(data);
  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push({ path: issue.path, message: issue.message });
    }
  }
  issues.push(...referenceIssues(data));
  issues.push(...extras);
  return dedupeIssues(issues);
}

export function parseCatalog(data: unknown, extras: CatalogIssue[] = []): Catalog {
  const issues = collectCatalogIssues(data, extras);
  if (issues.length > 0) throw new Error(formatCatalogError(issues));
  const result = catalogSchema.safeParse(data);
  if (!result.success) throw new Error(formatCatalogError(collectCatalogIssues(data, extras)));
  return result.data;
}

/** Site aliases. */
export type Product = Item;
export type AltProduct = AltItem;
