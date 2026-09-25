#!/usr/bin/env node
/**
 * Copy new or changed product images from the sheet worker's folder into public/images/.
 *
 *   npm run images:import [-- <source-dir>]
 *
 * Source: first argument, else $IMAGES_SRC, else /workspace/lifestyles-sheets/images.
 * Files are named <lifestyle>-<product>-<slot>.webp and Picks rows reference "/images/<file>".
 * Existing files with the same size and content are skipped; nothing is ever deleted.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const source = path.resolve(process.argv[2] ?? process.env.IMAGES_SRC ?? "/workspace/lifestyles-sheets/images");
const target = path.resolve("public/images");
const IMAGE = /\.(webp|avif|jpe?g|png|gif|svg)$/i;

if (!existsSync(source)) {
  console.error(`No image folder at ${source}. Pass a folder: npm run images:import -- <dir>`);
  process.exit(1);
}
mkdirSync(target, { recursive: true });

let added = 0;
let updated = 0;
let same = 0;
for (const name of readdirSync(source).sort()) {
  if (!IMAGE.test(name) || name.startsWith(".")) continue;
  if (!/^[A-Za-z0-9._-]+$/.test(name)) {
    console.warn(`skip ${name}: use letters, digits, dot, dash or underscore only`);
    continue;
  }
  const from = path.join(source, name);
  if (!statSync(from).isFile()) continue;
  const to = path.join(target, name);
  if (existsSync(to)) {
    if (statSync(to).size === statSync(from).size && readFileSync(to).equals(readFileSync(from))) {
      same += 1;
      continue;
    }
    updated += 1;
    console.log(`update public/images/${name}`);
  } else {
    added += 1;
    console.log(`add    public/images/${name}`);
  }
  copyFileSync(from, to);
}
console.log(`images:import: ${added} added, ${updated} updated, ${same} unchanged (from ${source})`);
