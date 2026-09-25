import assert from "node:assert/strict";
import { describe, it } from "node:test";
import catalogJson from "../data/catalog.json";
import { effectivePicks } from "./effective";
import { kitSummary, landingKitLine, liveBasedOn, priceHintsFor, suggestOutcome } from "./present";
import { formatCatalogError, formatIssuePath, parseCatalog, referenceIssues, type Catalog } from "./schema";

function catalog(): Catalog {
  return parseCatalog(structuredClone(catalogJson));
}

function product(brand: string, name: string, price: number) {
  return {
    brand,
    name,
    price,
    currency: "USD",
    url: "https://example.com/demo",
    image: "/images/placeholder.svg",
    why: "Demo line for a test pick",
  };
}

function withPick(data: Catalog, tier: string, category: string, price: number, brand = "Demo Brand"): Catalog {
  const next = structuredClone(data);
  next.picks = next.picks.filter((pick) => !(pick.tier === tier && pick.category === category));
  next.picks.push({
    tier,
    category,
    main: product(brand, `Demo ${category}`, price),
    alt: { ...product("Demo Alt", `Demo alt ${category}`, price - 1), when: "Demo when this instead" },
  });
  return next;
}

describe("basedOn validation", () => {
  it("accepts the seed catalog", () => {
    const data = catalog();
    assert.equal(data.tiers.map((tier) => tier.id).join(","), "budget,mid,premium,organic,money-no-object");
    assert.equal(data.tiers.find((tier) => tier.id === "organic")?.basedOn, "mid");
    assert.equal(data.tiers.find((tier) => tier.id === "money-no-object")?.group, "secondary");
    assert.equal(data.tiers.find((tier) => tier.id === "budget")?.group, "primary");
  });

  it("defaults a missing group to primary", () => {
    const raw = structuredClone(catalogJson) as { tiers: { group?: string }[] };
    delete raw.tiers[0]?.group;
    const data = parseCatalog(raw);
    assert.equal(data.tiers[0]?.group, "primary");
  });

  it("rejects an unknown basedOn", () => {
    const raw = structuredClone(catalogJson) as { tiers: { basedOn?: string }[] };
    raw.tiers[3]!.basedOn = "nope";
    const issues = referenceIssues(raw);
    const issue = issues.find((item) => formatIssuePath(item.path) === "tiers[3].basedOn");
    assert.equal(issue?.message, 'Unknown tier "nope"');
    assert.match(formatCatalogError(issues), /tiers\[3\]\.basedOn: Unknown tier "nope"/);
  });

  it("rejects a self reference", () => {
    const raw = structuredClone(catalogJson) as { tiers: { basedOn?: string }[] };
    raw.tiers[1]!.basedOn = "mid";
    const issues = referenceIssues(raw);
    const issue = issues.find((item) => formatIssuePath(item.path) === "tiers[1].basedOn");
    assert.equal(issue?.message, "cannot reference itself");
  });

  it("rejects a cycle and reports the walk", () => {
    const raw = structuredClone(catalogJson) as { tiers: { id: string; basedOn?: string }[] };
    const mid = raw.tiers.find((tier) => tier.id === "mid");
    const organic = raw.tiers.find((tier) => tier.id === "organic");
    assert.ok(mid && organic);
    mid.basedOn = "organic";
    organic.basedOn = "mid";
    const issues = referenceIssues(raw);
    const organicIssue = issues.find((item) => formatIssuePath(item.path) === "tiers[3].basedOn");
    const midIssue = issues.find((item) => formatIssuePath(item.path) === "tiers[1].basedOn");
    assert.equal(organicIssue?.message, "cycle organic → mid → organic");
    assert.equal(midIssue?.message, "cycle mid → organic → mid");
  });
});

describe("effectivePicks", () => {
  it("inherits a real base pick and keeps an own pick", () => {
    let data = catalog();
    data = withPick(data, "mid", "tee", 28);
    data = withPick(data, "mid", "sneakers", 90);
    data = withPick(data, "organic", "tee", 42, "Demo Leaf");
    const organic = effectivePicks(data, "organic");
    assert.equal(organic.get("tee")?.inheritedFrom, null);
    assert.equal(organic.get("tee")?.pick?.main.brand, "Demo Leaf");
    assert.equal(organic.get("sneakers")?.inheritedFrom, "mid");
    assert.equal(organic.get("sneakers")?.pick?.main.price, 90);
    assert.equal(organic.get("pants")?.pick, null);
    assert.equal(organic.get("pants")?.inheritedFrom, null);
  });

  it("walks a chain to the owner", () => {
    let data = catalog();
    data = withPick(data, "premium", "headphones", 300);
    const money = effectivePicks(data, "money-no-object");
    assert.equal(money.get("headphones")?.inheritedFrom, "premium");
    assert.equal(money.get("headphones")?.pick?.main.price, 300);
  });

  it("does not loop on a cycle", () => {
    const data = catalog();
    const mid = data.tiers.find((tier) => tier.id === "mid");
    const organic = data.tiers.find((tier) => tier.id === "organic");
    assert.ok(mid && organic);
    mid.basedOn = "organic";
    organic.basedOn = "mid";
    const organicPicks = effectivePicks(data, "organic");
    assert.equal(organicPicks.get("tee")?.pick, null);
  });

  it("counts inherited picks in the kit total", () => {
    let data = catalog();
    data = withPick(data, "mid", "tee", 28);
    data = withPick(data, "mid", "sneakers", 90);
    data = withPick(data, "organic", "bag", 40);
    const picks = [...effectivePicks(data, "organic").values()]
      .map((entry) => entry.pick)
      .filter((pick): pick is NonNullable<typeof pick> => pick != null);
    const tier = data.tiers.find((item) => item.id === "organic");
    assert.ok(tier);
    assert.equal(kitSummary(tier, data.categories.length, picks), "Your Organic kit: 10 things, about $158 for the 3 picks so far");
    assert.equal(landingKitLine(data.categories.length, picks), "Full kit: about $158 for 3 picks");
  });
});

describe("price hints", () => {
  it("hints the base on an own pick and stays quiet when the pick is inherited", () => {
    let data = catalog();
    data = withPick(data, "mid", "tee", 28);
    data = withPick(data, "mid", "sneakers", 90);
    data = withPick(data, "organic", "tee", 42);
    const own = priceHintsFor(data, "organic", "tee");
    assert.deepEqual(
      own.map((hint) => hint.text),
      ["Mid: $28"],
    );
    assert.equal(own[0]?.direction, "save");
    assert.deepEqual(priceHintsFor(data, "organic", "sneakers"), []);
  });

  it("does not hint a lifestyle against its own inherited copy", () => {
    let data = catalog();
    data = withPick(data, "premium", "laptop", 2000);
    data = withPick(data, "mid", "laptop", 900);
    const hints = priceHintsFor(data, "mid", "laptop").map((hint) => hint.tierId);
    assert.deepEqual(hints, ["premium"]);
    assert.deepEqual(priceHintsFor(data, "money-no-object", "laptop"), []);
  });
});

describe("suggester fallback", () => {
  it("sends a coming-soon lifestyle to its live base", () => {
    const tiers = [
      { id: "budget", name: "Budget", status: "coming_soon" as const, basedOn: null },
      { id: "mid", name: "Mid", status: "live" as const, basedOn: null },
      { id: "premium", name: "Premium", status: "coming_soon" as const, basedOn: null },
      { id: "organic", name: "Organic", status: "coming_soon" as const, basedOn: "mid" },
      { id: "money-no-object", name: "Money is no object", status: "coming_soon" as const, basedOn: "premium" },
    ];
    const chips = [
      { slug: "leaf", label: "Leaf", tierIds: ["organic"] },
      { slug: "gold", label: "Gold", tierIds: ["money-no-object"] },
    ];
    const organic = suggestOutcome(tiers, chips, ["leaf"]);
    assert.equal(organic.kind, "soon");
    if (organic.kind === "soon") assert.equal(organic.fallback?.id, "mid");
    const money = suggestOutcome(tiers, chips, ["gold"]);
    assert.equal(money.kind, "soon");
    if (money.kind === "soon") assert.equal(money.fallback?.id, "mid");
    assert.equal(liveBasedOn(tiers, tiers[3]!)?.id, "mid");
    assert.equal(liveBasedOn(tiers, tiers[4]!), null);
  });
});
