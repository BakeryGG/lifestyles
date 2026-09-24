import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TierPage, type TierPageModel } from "@/components/tier-page";
import { loadCatalog } from "@/lib/catalog";
import { groupsForTier, kitSummary } from "@/lib/present";

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
  const model: TierPageModel = {
    tier: {
      id: tier.id,
      name: tier.name,
      description: tier.description,
      status: tier.status,
      accent: tier.accent,
    },
    tiers: catalog.tiers.map((item) => ({
      id: item.id,
      name: item.name,
      status: item.status,
    })),
    groups: groupsForTier(catalog, tier.id),
    summary: kitSummary(tier, catalog.categories.length, picks),
    liveTiers: catalog.tiers
      .filter((item) => item.status === "live" && item.id !== tier.id)
      .map((item) => ({ id: item.id, name: item.name })),
  };

  return <TierPage model={model} />;
}
