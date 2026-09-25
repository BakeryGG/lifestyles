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

/** Brand chips for the suggester. `brandChips` wins when the key is present, even if empty. */
export function tierBrandList(tier: Pick<Tier, "brandChips" | "exampleBrands">): string[] {
  return visibleBrands(tier.brandChips ?? tier.exampleBrands);
}

/** Stable URL slug. "H&M" → "h-and-m", "Old Navy" → "old-navy". */
export function brandSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  return `${lead}, about ${money} for the ${priced.length} picks so far`;
}

/** Landing-card kit line. Shorter than the tier-page summary, still honest about partial prices. */
export function landingKitLine(categoryCount: number, picks: CatalogPick[]): string {
  const priced = picks.filter((pick) => isRealProduct(pick.main));
  if (priced.length === 0) return "Kit prices coming";
  const currencies = new Set(priced.map((pick) => pick.main.currency));
  if (currencies.size !== 1) return "Kit prices coming";
  const first = priced[0];
  if (!first) return "Kit prices coming";
  const total = priced.reduce((sum, pick) => sum + (Object.is(pick.main.price, -0) ? 0 : pick.main.price), 0);
  const money = formatPrice(total, first.main.currency);
  if (priced.length >= categoryCount) return `Full kit: about ${money}`;
  if (priced.length === 1) return `Full kit: about ${money} for 1 pick`;
  return `Full kit: about ${money} for ${priced.length} picks`;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/** Status pill copy, from tier names and statuses. No hard-coded tier ids. */
export function liveStatusLine(tiers: Pick<Tier, "name" | "status">[]): string {
  const live = tiers.filter((tier) => tier.status === "live").map((tier) => tier.name);
  const soon = tiers.filter((tier) => tier.status !== "live").map((tier) => tier.name);
  const liveText =
    live.length === 0 ? "No tier is live yet" : live.length === 1 ? `${live[0]} is live` : `${joinNames(live)} are live`;
  if (soon.length === 0) return liveText;
  return `${liveText} · ${joinNames(soon)} coming soon`;
}

export type LandingTierCard = {
  id: string;
  name: string;
  description: string;
  whoFor: string | null;
  status: Tier["status"];
  brands: string[];
  anchorLine: string;
  kitLine: string;
};

export function landingTierCards(catalog: Catalog): LandingTierCard[] {
  const anchor = catalog.categories.find((category) => category.id === catalog.landing.anchorCategory);
  const anchorName = anchor?.name ?? "Pick";
  return catalog.tiers.map((tier) => {
    const picks = catalog.picks.filter((pick) => pick.tier === tier.id);
    const anchorPick = picks.find((pick) => pick.category === catalog.landing.anchorCategory);
    const anchorReal = anchorPick && isRealProduct(anchorPick.main) ? anchorPick.main : null;
    const anchorLine = anchorReal
      ? `Typical ${anchorName.toLowerCase()}: ${formatPrice(anchorReal.price, anchorReal.currency)}`
      : `${anchorName} pick coming`;
    return {
      id: tier.id,
      name: tier.name,
      description: tier.description,
      whoFor: tier.whoFor ?? null,
      status: tier.status,
      brands: tierBrandList(tier),
      anchorLine,
      kitLine: landingKitLine(catalog.categories.length, picks),
    };
  });
}

export type CompareCell = {
  tierId: string;
  empty: boolean;
  brand: string | null;
  name: string | null;
  price: string | null;
  image: string | null;
};

export type CompareRow = {
  categoryId: string;
  categoryName: string;
  section: string;
  cells: CompareCell[];
};

export function comparisonRows(catalog: Catalog): CompareRow[] {
  return catalog.landing.compareCategories.map((categoryId) => {
    const category = catalog.categories.find((item) => item.id === categoryId);
    return {
      categoryId,
      categoryName: category?.name ?? categoryId,
      section: category?.section ?? "",
      cells: catalog.tiers.map((tier) => {
        const pick = catalog.picks.find((item) => item.tier === tier.id && item.category === categoryId);
        if (!pick || !isRealProduct(pick.main)) {
          return { tierId: tier.id, empty: true, brand: null, name: null, price: null, image: null };
        }
        return {
          tierId: tier.id,
          empty: false,
          brand: displayText(pick.main.brand),
          name: displayText(pick.main.name),
          price: formatPrice(pick.main.price, pick.main.currency),
          image: pick.main.image,
        };
      }),
    };
  });
}

export type SuggestChip = {
  slug: string;
  label: string;
  tierIds: string[];
};

/**
 * Brands from every tier, TODO skipped, round-robin across tier order so a tier
 * is not a visible group. The same slug on two tiers counts for both.
 */
export function suggestChips(catalog: Catalog): SuggestChip[] {
  const perTier = catalog.tiers.map((tier) => ({
    tierId: tier.id,
    labels: tierBrandList(tier),
  }));
  const max = Math.max(0, ...perTier.map((tier) => tier.labels.length));
  const ordered: { label: string; tierId: string }[] = [];
  for (let index = 0; index < max; index += 1) {
    for (const tier of perTier) {
      const label = tier.labels[index];
      if (label) ordered.push({ label, tierId: tier.tierId });
    }
  }
  const bySlug = new Map<string, SuggestChip>();
  for (const item of ordered) {
    const slug = brandSlug(item.label);
    if (!slug) continue;
    const existing = bySlug.get(slug);
    if (existing) {
      if (!existing.tierIds.includes(item.tierId)) existing.tierIds.push(item.tierId);
    } else {
      bySlug.set(slug, { slug, label: item.label, tierIds: [item.tierId] });
    }
  }
  return [...bySlug.values()];
}

export function parseBrandParam(value: string | null): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of value.split(",")) {
    const slug = part.trim().toLowerCase();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

export type SuggestTierRef = { id: string; name: string; status: Tier["status"] };

export type SuggestOutcome =
  | { kind: "empty" }
  | { kind: "match"; tier: SuggestTierRef }
  | { kind: "soon"; tier: SuggestTierRef; fallback: SuggestTierRef | null }
  | { kind: "tie"; tiers: SuggestTierRef[]; fallback: SuggestTierRef | null };

/** Majority of selected brands. A single live tier breaks a tie; otherwise the tie is shown. */
export function suggestOutcome(tiers: SuggestTierRef[], chips: SuggestChip[], slugs: readonly string[]): SuggestOutcome {
  const selected = new Set(slugs);
  const counts = new Map<string, number>(tiers.map((tier) => [tier.id, 0]));
  for (const chip of chips) {
    if (!selected.has(chip.slug)) continue;
    for (const tierId of chip.tierIds) {
      if (!counts.has(tierId)) continue;
      counts.set(tierId, (counts.get(tierId) ?? 0) + 1);
    }
  }
  const max = Math.max(0, ...counts.values());
  if (max === 0) return { kind: "empty" };
  const leaders = tiers.filter((tier) => counts.get(tier.id) === max);
  const live = tiers.find((tier) => tier.status === "live") ?? null;
  const first = leaders[0];
  if (leaders.length === 1 && first) {
    if (first.status !== "live") return { kind: "soon", tier: first, fallback: live };
    return { kind: "match", tier: first };
  }
  const liveLeaders = leaders.filter((tier) => tier.status === "live");
  const liveLeader = liveLeaders[0];
  if (liveLeaders.length === 1 && liveLeader) return { kind: "match", tier: liveLeader };
  return { kind: "tie", tiers: leaders, fallback: live };
}

export type ShownProduct = Product & { srcSet?: string };
export type ShownAlt = AltProduct & { srcSet?: string };

export type PresentedPick = {
  main: ShownProduct;
  alt: ShownAlt | null;
};

export type PriceHint = {
  tierId: string;
  tierName: string;
  /** "Premium: $180" — the arrow is presentational, from `direction`. */
  text: string;
  direction: "upgrade" | "save" | "other";
};

/** Real main picks other tiers have for this category. Empty when every other tier is still TODO. */
export function priceHintsFor(catalog: Catalog, tierId: string, categoryId: string): PriceHint[] {
  const current = catalog.picks.find((pick) => pick.tier === tierId && pick.category === categoryId);
  const currentReal = current && isRealProduct(current.main) ? current.main : null;
  const hints: PriceHint[] = [];
  for (const tier of catalog.tiers) {
    if (tier.id === tierId) continue;
    const pick = catalog.picks.find((item) => item.tier === tier.id && item.category === categoryId);
    if (!pick || !isRealProduct(pick.main)) continue;
    let direction: PriceHint["direction"] = "other";
    if (currentReal && currentReal.currency === pick.main.currency) {
      if (pick.main.price > currentReal.price) direction = "upgrade";
      else if (pick.main.price < currentReal.price) direction = "save";
    }
    hints.push({
      tierId: tier.id,
      tierName: tier.name,
      text: `${tier.name}: ${formatPrice(pick.main.price, pick.main.currency)}`,
      direction,
    });
  }
  return hints;
}

export type TierCategoryView = {
  id: string;
  name: string;
  /** 1-based position in catalog category order. */
  number: number;
  pick: PresentedPick | null;
  hints: PriceHint[];
};

export type TierGroupView = {
  section: string;
  /** Index of this label in `catalog.sections`. Heading ids use it, not a slug. */
  sectionIndex: number;
  categories: TierCategoryView[];
};

export function groupsForTier(catalog: Catalog, tierId: string): TierGroupView[] {
  const byCategory = new Map(
    catalog.picks.filter((pick) => pick.tier === tierId).map((pick) => [pick.category, pick]),
  );
  const numberById = new Map(catalog.categories.map((category, index) => [category.id, index + 1]));

  return catalog.sections
    .map((section, sectionIndex) => ({
      section,
      sectionIndex,
      categories: catalog.categories
        .filter((category) => category.section === section)
        .map((category) => {
          const number = numberById.get(category.id) ?? 0;
          const hints = priceHintsFor(catalog, tierId, category.id);
          const pick = byCategory.get(category.id);
          if (!pick || !isRealProduct(pick.main)) {
            return { id: category.id, name: category.name, number, pick: null, hints };
          }
          return {
            id: category.id,
            name: category.name,
            number,
            hints,
            pick: {
              main: pick.main,
              alt: isRealProduct(pick.alt) ? pick.alt : null,
            },
          };
        }),
    }))
    .filter((group) => group.categories.length > 0);
}
