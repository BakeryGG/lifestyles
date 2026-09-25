import { isPlaceholderBrand } from "./copy";
import type { Catalog, CatalogPick } from "./schema";

export type EffectivePick = {
  pick: CatalogPick | null;
  /**
   * Tier id that owns `pick` when this lifestyle has no real main of its own.
   * Null when the pick is this lifestyle's, or when nothing resolved.
   */
  inheritedFrom: string | null;
};

function pickKey(tierId: string, categoryId: string): string {
  return `${tierId}::${categoryId}`;
}

function ownRealPick(
  picks: Map<string, CatalogPick>,
  tierId: string,
  categoryId: string,
): CatalogPick | null {
  const pick = picks.get(pickKey(tierId, categoryId));
  if (!pick || isPlaceholderBrand(pick.main.brand)) return null;
  return pick;
}

function resolveCategory(
  tierId: string,
  categoryId: string,
  picks: Map<string, CatalogPick>,
  basedOnOf: Map<string, string | null>,
  stack: Set<string>,
): EffectivePick {
  const own = ownRealPick(picks, tierId, categoryId);
  if (own) return { pick: own, inheritedFrom: null };
  if (stack.has(tierId)) return { pick: null, inheritedFrom: null };
  const parentId = basedOnOf.get(tierId);
  if (!parentId) return { pick: null, inheritedFrom: null };
  stack.add(tierId);
  const parent = resolveCategory(parentId, categoryId, picks, basedOnOf, stack);
  if (!parent.pick) return { pick: null, inheritedFrom: null };
  return { pick: parent.pick, inheritedFrom: parent.inheritedFrom ?? parentId };
}

/**
 * Effective main pick for every product on one lifestyle.
 * A missing row, or a main brand that is still TODO, inherits the effective
 * pick of `basedOn`, walking that chain. Cycles resolve to an empty pick.
 */
const memo = new WeakMap<Catalog, Map<string, Map<string, EffectivePick>>>();

export function effectivePicks(catalog: Catalog, tierId: string): Map<string, EffectivePick> {
  let cache = memo.get(catalog);
  if (!cache) {
    cache = new Map();
    memo.set(catalog, cache);
  }
  const hit = cache.get(tierId);
  if (hit) return hit;
  const picks = new Map<string, CatalogPick>();
  for (const pick of catalog.picks) {
    picks.set(pickKey(pick.tier, pick.product), pick);
  }
  const basedOnOf = new Map(catalog.tiers.map((tier) => [tier.id, tier.basedOn ?? null]));
  const result = new Map<string, EffectivePick>();
  for (const product of catalog.products) {
    result.set(product.id, resolveCategory(tierId, product.id, picks, basedOnOf, new Set()));
  }
  cache.set(tierId, result);
  return result;
}
