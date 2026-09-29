import assert from "node:assert/strict";
import test from "node:test";
import { formatPrice, shortCardName } from "../lib/present.ts";

test("card subline keeps a short name, not the spec string", () => {
  assert.equal(shortCardName("SUPIMA® Cotton T-Shirt"), "SUPIMA®");
  assert.equal(shortCardName("SUPIMA® Cotton T-Shirt, White"), "SUPIMA®");
  assert.equal(shortCardName("iPhone 17, 256GB, Black, Unlocked"), "iPhone 17");
  assert.equal(shortCardName("QuietComfort Ultra Headphones (2nd Gen), Black"), "QuietComfort Ultra Headphones");
  assert.equal(shortCardName("Men's Commuter Pro Pant, Slim Fit, Black"), "Men's Commuter Pro Pant");
  assert.equal(
    shortCardName('IdeaPad 3i Chromebook 15.6" Full HD Laptop, Intel Celeron N4500, 4GB memory'),
    'IdeaPad 3i Chromebook 15.6" Full HD Laptop',
  );
  const backpack = shortCardName("Commuter Backpack - 22L External / 20L internal capacity");
  assert.equal(backpack, "Commuter Backpack");
  assert.ok(backpack.length <= 42);
});

test("displayed prices round to the nearest dollar", () => {
  assert.equal(formatPrice(24.9, "USD"), "$25");
  assert.equal(formatPrice(179.99, "USD"), "$180");
  assert.equal(formatPrice(399.99, "USD"), "$400");
  assert.equal(formatPrice(148, "USD"), "$148");
  assert.equal(formatPrice(0.49, "USD"), "$0");
});
