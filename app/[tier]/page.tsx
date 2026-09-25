import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TierView } from "@/components/tier-view";
import { loadCatalog, srcSetFor } from "@/lib/catalog";
import { groupsForTier, kitSummary, type TierGroupView } from "@/lib/present";

export function generateStaticParams() {
  return loadCatalog().tiers.map((tier) => ({ tier: tier.id }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tier: string }>;
}): Promise<Metadata> {
  const { tier: tierId } = await params;
  const tier = loadCatalog().tiers.find((item) => item.id === tierId);
  if (!tier) return { title: "Not found" };
  return { title: tier.name, description: tier.description };
}

function withImageSources(groups: TierGroupView[]): TierGroupView[] {
  return groups.map((group) => ({
    ...group,
    categories: group.categories.map((category) => ({
      ...category,
      pick: category.pick
        ? {
            main: { ...category.pick.main, srcSet: srcSetFor(category.pick.main.image) },
            alt: category.pick.alt
              ? { ...category.pick.alt, srcSet: srcSetFor(category.pick.alt.image) }
              : null,
          }
        : null,
    })),
  }));
}

export default async function TierRoute({
  params,
}: {
  params: Promise<{ tier: string }>;
}) {
  const { tier: tierId } = await params;
  const catalog = loadCatalog();
  const tier = catalog.tiers.find((item) => item.id === tierId);
  if (!tier) notFound();

  const picks = catalog.picks.filter((pick) => pick.tier === tier.id);
  const groups = withImageSources(groupsForTier(catalog, tier.id));
  const liveTiers = catalog.tiers
    .filter((item) => item.status === "live" && item.id !== tier.id)
    .map((item) => ({ id: item.id, name: item.name }));
  const view = {
    tier: {
      id: tier.id,
      name: tier.name,
      description: tier.description,
      status: tier.status,
    },
    tiers: catalog.tiers.map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
    })),
    groups,
    summary: kitSummary(tier, catalog.categories.length, picks),
    liveTiers,
  };

  const categories = groups.flatMap((group) =>
    group.categories.map((category) => ({
      id: category.id,
      name: category.name,
      section: group.section,
      number: category.number,
      pick: category.pick,
    })),
  );
  const { TierShell } = await import("@/components/tier-shell");
  return (
    <TierShell live tierName={tier.name} accent={tier.accent} categories={categories}>
      <TierView {...view} />
    </TierShell>
  );
}
