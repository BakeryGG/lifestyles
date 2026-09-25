import { BrandSuggester } from "@/components/brand-suggester";
import { ComparisonStrip } from "@/components/comparison-strip";
import { LandingTiers } from "@/components/landing-tiers";
import { Wordmark } from "@/components/wordmark";
import { loadCatalog, srcSetFor } from "@/lib/catalog";
import { comparisonRows, landingTierCards, liveStatusLine, suggestChips } from "@/lib/present";

export default function HomePage() {
  const catalog = loadCatalog();
  const rows = comparisonRows(catalog);
  const srcSets: Record<string, string | undefined> = {};
  for (const row of rows) {
    for (const cell of row.cells) {
      if (!cell.image) continue;
      srcSets[`${cell.tierId}:${row.categoryId}`] = srcSetFor(cell.image);
    }
  }
  const tiers = catalog.tiers.map((tier) => ({
    id: tier.id,
    name: tier.name,
    status: tier.status,
  }));

  return (
    <>
      <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur-md" style={{ viewTransitionName: "site-header" }}>
        <div className="mx-auto flex h-16 max-w-[1440px] items-center px-4 sm:px-8">
          <Wordmark />
        </div>
      </header>
      <main id="content" tabIndex={-1} className="content-focus mx-auto w-full max-w-[1120px] scroll-mt-16 px-4 pb-24 sm:px-8">
        <div className="flex flex-col items-center pt-12 text-center sm:pt-20">
          <p className="inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-[13px] text-muted ring-1 ring-inset ring-line">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-signal" />
            {liveStatusLine(catalog.tiers)}
          </p>
          <h1 className="mt-6 max-w-[16ch] text-balance text-[2rem] leading-[1.12] font-normal tracking-[-0.02em] text-ink sm:text-[2.5rem] sm:leading-[1.1]">
            {"Pick how you live. We'll tell you what to buy."}
          </h1>
          <p className="mt-4 text-[15px] leading-6 text-muted">One pick for everything, at your level.</p>
        </div>
        <LandingTiers cards={landingTierCards(catalog)} />
        <section className="mt-16 sm:mt-24">
          <h2 className="text-[1.5rem] leading-none font-normal tracking-[-0.02em] text-ink">Side by side</h2>
          <ComparisonStrip tiers={tiers} rows={rows} srcSets={srcSets} />
        </section>
        <BrandSuggester chips={suggestChips(catalog)} tiers={tiers} />
      </main>
    </>
  );
}
