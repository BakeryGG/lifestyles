import { isBuyableUrl, isPlaceholderBrand, isUnfinishedCopy } from "./copy";
import { effectivePicks, type EffectivePick } from "./effective";
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
    live.length === 0
      ? "No lifestyle is live yet"
      : live.length === 1
        ? `${live[0]} is live`
        : `${joinNames(live)} are live`;
  if (soon.length === 0) return liveText;
  return `${liveText} · ${joinNames(soon)} coming soon`;
}

export type LandingTierCard = {
  id: string;
  name: string;
  description: string;
  whoFor: string | null;
  status: Tier["status"];
  group: Tier["group"];
  brands: string[];
  anchorLine: string;
  kitLine: string;
};

function resolvedPicks(catalog: Catalog, tierId: string): CatalogPick[] {
  return [...effectivePicks(catalog, tierId).values()]
    .map((entry) => entry.pick)
    .filter((pick): pick is CatalogPick => pick != null && isRealProduct(pick.main));
}

export function landingTierCards(catalog: Catalog): LandingTierCard[] {
  const anchor = catalog.products.find((product) => product.id === catalog.landing.anchorProduct);
  const anchorName = anchor?.name ?? "Pick";
  return catalog.tiers.map((tier) => {
    const resolved = effectivePicks(catalog, tier.id);
    const picks = [...resolved.values()]
      .map((entry) => entry.pick)
      .filter((pick): pick is CatalogPick => pick != null);
    const anchorPick = resolved.get(catalog.landing.anchorProduct)?.pick ?? null;
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
      group: tier.group,
      brands: tierBrandList(tier),
      anchorLine,
      kitLine: landingKitLine(catalog.products.length, picks),
    };
  });
}

/** Primary lifestyles, in file order. Falls back to every lifestyle when none are primary. */
export function comparisonTiers(catalog: Catalog): Tier[] {
  const primary = catalog.tiers.filter((tier) => tier.group !== "secondary");
  return primary.length > 0 ? primary : [...catalog.tiers];
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

/** landing.compareProducts, else featured products, else the first few by order. */
export function compareProductIds(catalog: Catalog): string[] {
  if (catalog.landing.compareProducts.length > 0) return catalog.landing.compareProducts;
  const featured = catalog.products.filter((product) => product.categories.includes(FEATURED_ID));
  return (featured.length > 0 ? featured : catalog.products).slice(0, 6).map((product) => product.id);
}

export const FEATURED_ID = "featured";

export function comparisonRows(catalog: Catalog): CompareRow[] {
  const columns = comparisonTiers(catalog);
  const resolved = new Map(columns.map((tier) => [tier.id, effectivePicks(catalog, tier.id)]));
  const tagName = new Map(catalog.categories.map((tag) => [tag.id, tag.name]));
  return compareProductIds(catalog).map((categoryId) => {
    const product = catalog.products.find((item) => item.id === categoryId);
    return {
      categoryId,
      categoryName: product?.name ?? categoryId,
      section: product ? (tagName.get(product.primaryCategory) ?? "") : "",
      cells: columns.map((tier) => {
        const pick = resolved.get(tier.id)?.get(categoryId)?.pick ?? null;
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

export type SuggestTierRef = {
  id: string;
  name: string;
  status: Tier["status"];
  basedOn?: string | null;
};

/** Nearest live lifestyle along `basedOn`, if that ancestor is live. */
export function liveBasedOn(tiers: SuggestTierRef[], tier: SuggestTierRef): SuggestTierRef | null {
  const byId = new Map(tiers.map((item) => [item.id, item]));
  const seen = new Set<string>([tier.id]);
  let nextId = tier.basedOn ?? null;
  while (nextId && !seen.has(nextId)) {
    seen.add(nextId);
    const next = byId.get(nextId);
    if (!next) return null;
    if (next.status === "live") return next;
    nextId = next.basedOn ?? null;
  }
  return null;
}

function soonFallback(tiers: SuggestTierRef[], tier: SuggestTierRef): SuggestTierRef | null {
  return liveBasedOn(tiers, tier) ?? tiers.find((item) => item.status === "live") ?? null;
}

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
  const first = leaders[0];
  if (leaders.length === 1 && first) {
    if (first.status !== "live") return { kind: "soon", tier: first, fallback: soonFallback(tiers, first) };
    return { kind: "match", tier: first };
  }
  const liveLeaders = leaders.filter((tier) => tier.status === "live");
  const liveLeader = liveLeaders[0];
  if (liveLeaders.length === 1 && liveLeader) return { kind: "match", tier: liveLeader };
  const tieLead = leaders.find((tier) => tier.status !== "live") ?? first;
  return { kind: "tie", tiers: leaders, fallback: tieLead ? soonFallback(tiers, tieLead) : null };
}

export type ShownProduct = Product & { srcSet?: string };
export type ShownAlt = AltProduct & { srcSet?: string };

export type PresentedPick = {
  main: ShownProduct;
  /** Real alternatives only (placeholder brands dropped), at most 3, display order. */
  alts: ShownAlt[];
};

export type PriceHint = {
  tierId: string;
  tierName: string;
  /** "Premium: $180" — the arrow is presentational, from `direction`. */
  text: string;
  direction: "upgrade" | "save" | "other";
};

function hintDirection(
  current: Product | null,
  other: Product,
): PriceHint["direction"] {
  if (!current || current.currency !== other.currency) return "other";
  if (other.price > current.price) return "upgrade";
  if (other.price < current.price) return "save";
  return "other";
}

function ownerId(entry: EffectivePick | undefined, tierId: string): string | null {
  if (!entry?.pick || !isRealProduct(entry.pick.main)) return null;
  return entry.inheritedFrom ?? tierId;
}

/**
 * Price hints for one card.
 * A lifestyle with `basedOn` is compared only to that base's effective pick.
 * If this card inherited that same pick, there is no hint.
 * Otherwise, hints use other lifestyles' own real mains (not inherited copies).
 */
export function priceHintsFor(catalog: Catalog, tierId: string, categoryId: string): PriceHint[] {
  const tier = catalog.tiers.find((item) => item.id === tierId);
  if (!tier) return [];
  const currentEntry = effectivePicks(catalog, tierId).get(categoryId);
  const currentReal = currentEntry?.pick && isRealProduct(currentEntry.pick.main) ? currentEntry.pick.main : null;
  const currentOwner = ownerId(currentEntry, tierId);

  if (tier.basedOn) {
    const baseTier = catalog.tiers.find((item) => item.id === tier.basedOn);
    if (!baseTier) return [];
    const baseEntry = effectivePicks(catalog, baseTier.id).get(categoryId);
    const baseOwner = ownerId(baseEntry, baseTier.id);
    if (currentOwner && baseOwner && currentOwner === baseOwner) return [];
    if (!baseEntry?.pick || !isRealProduct(baseEntry.pick.main)) return [];
    return [
      {
        tierId: baseTier.id,
        tierName: baseTier.name,
        text: `${baseTier.name}: ${formatPrice(baseEntry.pick.main.price, baseEntry.pick.main.currency)}`,
        direction: hintDirection(currentReal, baseEntry.pick.main),
      },
    ];
  }

  const hints: PriceHint[] = [];
  for (const other of catalog.tiers) {
    if (other.id === tierId) continue;
    const own = catalog.picks.find((pick) => pick.tier === other.id && pick.product === categoryId);
    if (!own || !isRealProduct(own.main)) continue;
    if (currentOwner === other.id || currentEntry?.pick === own) continue;
    hints.push({
      tierId: other.id,
      tierName: other.name,
      text: `${other.name}: ${formatPrice(own.main.price, own.main.currency)}`,
      direction: hintDirection(currentReal, own.main),
    });
  }
  return hints;
}

export type TierCategoryView = {
  id: string;
  name: string;
  /** Tag ids this product carries (primary first). */
  tags: string[];
  primaryName: string;
  pick: PresentedPick | null;
  /** Set when the shown pick is inherited. The drawer may say "Same as {name}". */
  inheritedFromName: string | null;
};

export type TierGroupView = {
  /** Primary category (tag) id and name. */
  id: string;
  section: string;
  sectionIndex: number;
  categories: TierCategoryView[];
};

/** Every product, grouped by primaryCategory in tag order, products by order. */
export function groupsForTier(catalog: Catalog, tierId: string): TierGroupView[] {
  const resolved = effectivePicks(catalog, tierId);
  const nameById = new Map(catalog.tiers.map((tier) => [tier.id, tier.name]));
  const tags = [...catalog.categories].sort((a, b) => a.order - b.order);
  const products = [...catalog.products].sort((a, b) => a.order - b.order);

  return tags
    .map((tag, sectionIndex) => ({
      id: tag.id,
      section: tag.name,
      sectionIndex,
      categories: products
        .filter((product) => product.primaryCategory === tag.id)
        .map((product): TierCategoryView => {
          const entry = resolved.get(product.id);
          const pick = entry?.pick;
          const base = { id: product.id, name: product.name, tags: product.categories, primaryName: tag.name };
          if (!pick || !isRealProduct(pick.main)) {
            return { ...base, pick: null, inheritedFromName: null };
          }
          return {
            ...base,
            inheritedFromName: entry?.inheritedFrom ? (nameById.get(entry.inheritedFrom) ?? null) : null,
            pick: { main: pick.main, alts: pick.alts.filter((alt) => isRealProduct(alt)).slice(0, 3) },
          };
        }),
    }))
    .filter((group) => group.categories.length > 0);
}

export type KitView = { id: string; name: string; count: number; picked: number; summary: string };

function viewSummary(lead: string, noun: string, count: number, picks: CatalogPick[]): string {
  const priced = picks.filter((pick) => isRealProduct(pick.main));
  const things = `${count} ${noun}${count === 1 ? "" : "s"}`;
  if (priced.length === 0) return `${lead}: ${things}, prices coming`;
  const currencies = new Set(priced.map((pick) => pick.main.currency));
  if (currencies.size !== 1) return `${lead}: ${things}, prices coming`;
  const total = priced.reduce((sum, pick) => sum + (Object.is(pick.main.price, -0) ? 0 : pick.main.price), 0);
  const money = formatPrice(total, priced[0]!.main.currency);
  if (priced.length >= count) return `${lead}: ${things}, about ${money}`;
  return `${lead}: ${priced.length} of ${things} picked, about ${money}`;
}

/** One summary per chip: "featured", "all", then every tag with products. */
export function kitViews(catalog: Catalog, tier: Pick<Tier, "id" | "name">): KitView[] {
  const resolved = effectivePicks(catalog, tier.id);
  const picksFor = (ids: string[]) =>
    ids.map((id) => resolved.get(id)?.pick).filter((pick): pick is CatalogPick => pick != null && isRealProduct(pick.main));
  const lead = `Your ${tier.name} kit`;
  const views: KitView[] = [];
  const allIds = catalog.products.map((product) => product.id);
  const tags = [...catalog.categories].sort((a, b) => a.order - b.order);
  for (const tag of tags) {
    const ids = catalog.products.filter((product) => product.categories.includes(tag.id)).map((product) => product.id);
    if (ids.length === 0) continue;
    const picks = picksFor(ids);
    const featured = tag.id === FEATURED_ID;
    views.push({
      id: tag.id,
      name: tag.name,
      count: ids.length,
      picked: picks.length,
      summary: viewSummary(featured ? lead : `${tag.name}`, featured ? "featured pick" : "pick", ids.length, picks),
    });
  }
  const allPicks = picksFor(allIds);
  const all: KitView = { id: "all", name: "All", count: allIds.length, picked: allPicks.length, summary: viewSummary(lead, "pick", allIds.length, allPicks) };
  const featuredIndex = views.findIndex((view) => view.id === FEATURED_ID);
  views.splice(featuredIndex >= 0 ? featuredIndex + 1 : 0, 0, all);
  return views;
}

/** Featured when any product carries the tag, else All. */
export function defaultViewId(catalog: Catalog): string {
  return catalog.products.some((product) => product.categories.includes(FEATURED_ID)) ? FEATURED_ID : "all";
}

export function kitPicks(catalog: Catalog, tierId: string): CatalogPick[] {
  return resolvedPicks(catalog, tierId);
}
