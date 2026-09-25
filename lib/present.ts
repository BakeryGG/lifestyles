import { isBuyableUrl, isPlaceholderBrand, isUnfinishedCopy } from "./copy";
import type { AltProduct, Catalog, CatalogPick, Product, Tier } from "./schema";

export { isBuyableUrl, isPlaceholderBrand, isUnfinishedCopy };

export function isRealProduct(product: { brand?: string | null } | null | undefined): boolean {
  return !!product && !isPlaceholderBrand(product.brand);
}

/** Hide blank copy and curator TODO notes. Real titles that contain "todo" stay visible. */
export function displayText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || isUnfinishedCopy(trimmed)) return null;
  return trimmed;
}

export function visibleBrands(brands: string[]): string[] {
  return brands.filter((brand) => !isPlaceholderBrand(brand));
}

export function formatPrice(price: number, currency: string): string {
  const amount = Object.is(price, -0) ? 0 : price;
  const digits = Number.isInteger(amount) ? 0 : 2;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
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

  const total = priced.reduce((sum, pick) => sum + (Object.is(pick.main.price, -0) ? 0 : pick.main.price), 0);
  const money = formatPrice(total, priced[0].main.currency);
  if (priced.length >= categoryCount) return `${lead}, about ${money} total`;
  if (priced.length === 1) return `${lead}, about ${money} for the 1 pick so far`;
  return `${lead}, about ${money} for the ${priced.length} picked so far`;
}

export type ShownProduct = Product & { srcSet?: string };
export type ShownAlt = AltProduct & { srcSet?: string };

export type PresentedPick = {
  main: ShownProduct;
  alt: ShownAlt | null;
};

export type TierCategoryView = {
  id: string;
  name: string;
  /** 1-based position in catalog category order. */
  number: number;
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
  const numberById = new Map(catalog.categories.map((category, index) => [category.id, index + 1]));

  return catalog.sections
    .map((section) => ({
      section,
      categories: catalog.categories
        .filter((category) => category.section === section)
        .map((category) => {
          const number = numberById.get(category.id) ?? 0;
          const pick = byCategory.get(category.id);
          if (!pick || !isRealProduct(pick.main)) {
            return { id: category.id, name: category.name, number, pick: null };
          }
          return {
            id: category.id,
            name: category.name,
            number,
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
  /** Accent darkened until white label text clears WCAG AA. Buy buttons only. */
  buttonBg: string;
  buttonFg: string;
  /** Soft wash of the original accent. */
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
