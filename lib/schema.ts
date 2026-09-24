import { z } from "zod";

const slug = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Expected a lowercase slug (letters, numbers, and hyphens)",
  );

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
  brand: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  price: z
    .number()
    .refine((value) => Number.isFinite(value), "Expected a finite number")
    .refine((value) => value >= 0, "Expected a number greater than or equal to 0"),
  currency,
  url: z.string().min(1, "Required"),
  image: imagePath,
  why: z.string().min(1, "Required").max(90, "Expected at most 90 characters"),
});

const altSchema = productSchema.extend({
  when: z.string().min(1, "Required").max(90, "Expected at most 90 characters"),
});

const tierSchema = z.object({
  id: slug,
  name: z.string().min(1, "Required"),
  description: z.string().min(1, "Required"),
  exampleBrands: z.array(z.string().min(1, "Required")),
  status: z.enum(["live", "coming_soon"]),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Expected a hex color like #10B981"),
});

const categorySchema = z.object({
  id: slug,
  name: z.string().min(1, "Required"),
  section: z.string().min(1, "Required"),
});

const pickSchema = z.object({
  tier: z.string().min(1, "Required"),
  category: z.string().min(1, "Required"),
  main: productSchema,
  alt: altSchema,
});

export const catalogSchema = z.object({
  tiers: z.array(tierSchema).min(1, "Expected at least one tier"),
  sections: z.array(z.string().min(1, "Required")).min(1, "Expected at least one section"),
  categories: z.array(categorySchema),
  picks: z.array(pickSchema),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reference checks run even when other fields have the wrong type. */
export function referenceIssues(data: unknown): { path: PropertyKey[]; message: string }[] {
  if (!isRecord(data)) return [];
  const issues: { path: PropertyKey[]; message: string }[] = [];
  const tiers = Array.isArray(data.tiers) ? data.tiers : [];
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const picks = Array.isArray(data.picks) ? data.picks : [];

  const tierIds = new Map<string, number>();
  tiers.forEach((tier, index) => {
    if (!isRecord(tier) || typeof tier.id !== "string") return;
    const previous = tierIds.get(tier.id);
    if (previous !== undefined) {
      issues.push({
        path: ["tiers", index, "id"],
        message: `Duplicate tier id ${JSON.stringify(tier.id)} (also at tiers[${previous}].id)`,
      });
    } else {
      tierIds.set(tier.id, index);
    }
  });

  const sectionNames = new Map<string, number>();
  sections.forEach((section, index) => {
    if (typeof section !== "string") return;
    const previous = sectionNames.get(section);
    if (previous !== undefined) {
      issues.push({
        path: ["sections", index],
        message: `Duplicate section ${JSON.stringify(section)} (also at sections[${previous}])`,
      });
    } else {
      sectionNames.set(section, index);
    }
  });

  const categoryIds = new Map<string, number>();
  categories.forEach((category, index) => {
    if (!isRecord(category)) return;
    if (typeof category.id === "string") {
      const previous = categoryIds.get(category.id);
      if (previous !== undefined) {
        issues.push({
          path: ["categories", index, "id"],
          message: `Duplicate category id ${JSON.stringify(category.id)} (also at categories[${previous}].id)`,
        });
      } else {
        categoryIds.set(category.id, index);
      }
    }
    if (typeof category.section === "string" && !sectionNames.has(category.section)) {
      issues.push({
        path: ["categories", index, "section"],
        message: `Unknown section ${JSON.stringify(category.section)}`,
      });
    }
  });

  const pickKeys = new Map<string, number>();
  picks.forEach((pick, index) => {
    if (!isRecord(pick)) return;
    if (typeof pick.tier === "string" && !tierIds.has(pick.tier)) {
      issues.push({
        path: ["picks", index, "tier"],
        message: `Unknown tier ${JSON.stringify(pick.tier)}`,
      });
    }
    if (typeof pick.category === "string" && !categoryIds.has(pick.category)) {
      issues.push({
        path: ["picks", index, "category"],
        message: `Unknown category ${JSON.stringify(pick.category)}`,
      });
    }
    if (typeof pick.tier === "string" && typeof pick.category === "string") {
      const key = `${pick.tier}::${pick.category}`;
      const previous = pickKeys.get(key);
      if (previous !== undefined) {
        issues.push({
          path: ["picks", index],
          message: `Duplicate pick for tier ${JSON.stringify(pick.tier)} and category ${JSON.stringify(pick.category)} (also at picks[${previous}])`,
        });
      } else {
        pickKeys.set(key, index);
      }
    }
  });

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

export function parseCatalog(data: unknown): Catalog {
  const result = catalogSchema.safeParse(data);
  const references = referenceIssues(data);
  if (!result.success || references.length > 0) {
    const lines = [
      ...(result.success
        ? []
        : result.error.issues.map((issue) => `  - ${formatIssuePath(issue.path)}: ${issue.message}`)),
      ...references.map((issue) => `  - ${formatIssuePath(issue.path)}: ${issue.message}`),
    ];
    throw new Error(`catalog.json is invalid:\n${lines.join("\n")}`);
  }
  return result.data;
}
