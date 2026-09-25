import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PickController } from "@/components/pick-controller";
import { TierView } from "@/components/tier-view";
import { loadCatalog } from "@/lib/catalog";
import { flattenGroups, groupsForTier, kitSummary } from "@/lib/present";

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
  const categories = flattenGroups(groupsForTier(catalog, tier.id));
  const liveTiers = catalog.tiers
    .filter((item) => item.status === "live" && item.id !== tier.id)
    .map((item) => ({ id: item.id, name: item.name }));

  return (
    <PickController
      live={tier.status === "live"}
      tierName={tier.name}
      accent={tier.accent}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        pick: category.pick,
      }))}
    >
      <TierView
        tier={{
          id: tier.id,
          name: tier.name,
          description: tier.description,
          status: tier.status,
          accent: tier.accent,
        }}
        tiers={catalog.tiers.map((item) => ({
          id: item.id,
          name: item.name,
          status: item.status,
        }))}
        categories={categories}
        summary={kitSummary(tier, catalog.categories.length, picks)}
        liveTiers={liveTiers}
      />
    </PickController>
  );
}
