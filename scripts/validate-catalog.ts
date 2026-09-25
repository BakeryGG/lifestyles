import { loadCatalog } from "../lib/catalog";

try {
  const catalog = loadCatalog();
  console.log(
    `catalog.json is valid (${catalog.tiers.length} lifestyles, ${catalog.categories.length} categories, ${catalog.products.length} products, ${catalog.picks.length} picks).`,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
