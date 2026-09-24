import type { AltProduct, Catalog, CatalogPick, Product, Tier } from "./schema";

/** Curator placeholder. The seed uses the exact brand string "TODO". */
export function isPlaceholderBrand(brand: string | null | undefined): boolean {
  if (brand == null) return true;
  const value = brand.trim();
  return value.length === 0 || value.toUpperCase() === "TODO";
}

export function isRealProduct(product: { brand?: string | null } | null | undefined): boolean {
  return !!product && !isPlaceholderBrand(product.brand);
}

/** Returns null for blank values and curator TODO notes so they are never shown. */
export function displayText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const upper = trimmed.toUpperCase();
  if (upper === "TODO" || upper.startsWith("TODO:") || upper.startsWith("TODO ")) {
    return null;
  }
  return trimmed;
}

export function visibleBrands(brands: string[]): string[] {
  return brands.filter((brand) => !isPlaceholderBrand(brand));
}

export function isBuyableUrl(url: string | null | undefined): boolean {
  if (!url || /todo/i.test(url)) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function formatPrice(price: number, currency: string): string {
  const digits = Number.isInteger(price) ? 0 : 2;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

export function kitSummary(
  tier: Pick<Tier, "name">,
  categoryCount: number,
  picks: CatalogPick[],
): string {
  const noun = categoryCount === 1 ? "thing" : "things";
  const lead = `Your ${tier.name} kit: ${categoryCount} ${noun}`;
  const priced = picks.filter((pick) => isRealProduct(pick.main));
  if (priced.length === 0) return `${lead}, prices coming`;

  const currencies = new Set(priced.map((pick) => pick.main.currency));
  if (currencies.size !== 1) return `${lead}, prices coming`;

  const total = priced.reduce((sum, pick) => sum + pick.main.price, 0);
  return `${lead}, about ${formatPrice(total, priced[0].main.currency)} total`;
}

export type PresentedPick = {
  main: Product;
  alt: AltProduct | null;
};

export type TierCategoryView = {
  id: string;
  name: string;
  pick: PresentedPick | null;
};

export type TierGroupView = {
  section: string;
  categories: TierCategoryView[];
};

export function groupsForTier(catalog: Catalog, tierId: string): TierGroupView[] {
  const byCategory = new Map(
    catalog.picks.filter((pick) => pick.tier === tierId).map((pick) => [pick.category, pick]),
  );

  return catalog.sections
    .map((section) => ({
      section,
      categories: catalog.categories
        .filter((category) => category.section === section)
        .map((category) => {
          const pick = byCategory.get(category.id);
          if (!pick || !isRealProduct(pick.main)) {
            return { id: category.id, name: category.name, pick: null };
          }
          return {
            id: category.id,
            name: category.name,
            pick: {
              main: pick.main,
              alt: isRealProduct(pick.alt) ? pick.alt : null,
            },
          };
        }),
    }))
    .filter((group) => group.categories.length > 0);
}

export type AccentColors = {
  raw: string;
  /** Accent darkened until white label text clears WCAG AA, for buttons and the active switcher. */
  buttonBg: string;
  buttonFg: string;
  /** Soft wash of the original accent for the kit strip. */
  tint: string;
};

function hexToRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function toHex(value: number): string {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
}

export function accentColors(accent: string): AccentColors {
  const raw = /^#[0-9A-Fa-f]{6}$/.test(accent) ? accent : "#1c1c1a";
  const [r, g, b] = hexToRgb(raw);
  let br = r;
  let bg = g;
  let bb = b;
  for (let step = 0; step < 40 && contrast(luminance(br, bg, bb), 1) < 4.5; step += 1) {
    br = Math.round(br * 0.86);
    bg = Math.round(bg * 0.86);
    bb = Math.round(bb * 0.86);
  }
  return {
    raw,
    buttonBg: `#${toHex(br)}${toHex(bg)}${toHex(bb)}`,
    buttonFg: "#ffffff",
    tint: `rgba(${r}, ${g}, ${b}, 0.14)`,
  };
}
