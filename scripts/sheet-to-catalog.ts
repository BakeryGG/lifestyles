/**
 * Read a lifestyles workbook (Google Sheet or local CSVs) and write catalog JSON (v2).
 *
 * Tabs: lifestyles (legacy name: tiers), categories (tags), products (product types),
 * picks, and optional settings. There is no sections tab. README is never read.
 *
 *   tsx scripts/sheet-to-catalog.ts (--sheet-id <ID> | --csv-dir <DIR>) [--out <path>] [--schema <path>] [--check]
 *
 * Default --schema is lib/schema.ts (the site's v2 schema).
 *
 * Exit codes: 0 = wrote (or checked) a valid catalog; 1 = the sheet was read but has
 * problems (catalog.json is left untouched); 2 = the sheet could not be reached
 * (network, 401/403/404, HTML login page), catalog.json is left untouched.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { formatSheetProblems, sheetToCatalog } from "./lib/convert.ts";
import { loadTables, SheetReadError, SheetUnreachableError } from "./lib/fetch.ts";
import type { CatalogIssue } from "../lib/schema.ts";

type SchemaModule = {
  collectCatalogIssues: (data: unknown) => CatalogIssue[];
};

type Flags = {
  sheetId?: string;
  csvDir?: string;
  out: string;
  schema?: string;
  check: boolean;
};

function usage(): string {
  return 'Usage: tsx scripts/sheet-to-catalog.ts (--sheet-id <ID> | --csv-dir <DIR>) [--out <path>] [--schema <path>] [--check]';
}

function readFlags(argv: string[]): Flags {
  const flags: Flags = { out: "data/catalog.json", check: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const take = (name: string): string => {
      const inline = arg.startsWith(`${name}=`) ? arg.slice(name.length + 1) : undefined;
      const value = inline ?? argv[i + 1];
      if (!inline) i += 1;
      if (!value || value.startsWith("--")) {
        throw new SheetReadError(`Missing value for ${name}`);
      }
      return value;
    };
    if (arg === "--check") flags.check = true;
    else if (arg === "--sheet-id" || arg.startsWith("--sheet-id=")) flags.sheetId = take("--sheet-id");
    else if (arg === "--csv-dir" || arg.startsWith("--csv-dir=")) flags.csvDir = take("--csv-dir");
    else if (arg === "--out" || arg.startsWith("--out=")) flags.out = take("--out");
    else if (arg === "--schema" || arg.startsWith("--schema=")) flags.schema = take("--schema");
    else if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    } else {
      throw new SheetReadError(`Unknown argument ${arg}\n${usage()}`);
    }
  }
  if (!flags.sheetId && !flags.csvDir) flags.sheetId = process.env.SHEET_ID;
  if (flags.sheetId && flags.csvDir) {
    throw new SheetReadError(`Pass only one of --sheet-id or --csv-dir\n${usage()}`);
  }
  if (!flags.sheetId && !flags.csvDir) {
    throw new SheetReadError(`Pass --sheet-id or --csv-dir (or set SHEET_ID)\n${usage()}`);
  }
  return flags;
}

async function loadSchema(schemaPath: string | undefined): Promise<SchemaModule> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const resolved = path.resolve(schemaPath ?? path.join(scriptDir, "../lib/schema.ts"));
  let mod: SchemaModule;
  try {
    mod = (await import(pathToFileURL(resolved).href)) as SchemaModule;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new SheetReadError(`Could not load schema ${resolved}: ${detail}`);
  }
  if (typeof mod.collectCatalogIssues !== "function") {
    throw new SheetReadError(`Schema module ${resolved} does not export collectCatalogIssues`);
  }
  return mod;
}

async function main(): Promise<void> {
  const flags = readFlags(process.argv.slice(2));
  const tables = await loadTables(flags.csvDir ? { csvDir: flags.csvDir } : { sheetId: flags.sheetId! });
  const result = sheetToCatalog(tables);
  const schema = await loadSchema(flags.schema);
  const schemaIssues = schema.collectCatalogIssues(result.catalog);
  const report = formatSheetProblems(result, schemaIssues);
  for (const warning of result.warnings) console.error(warning);
  if (report) {
    console.error(report);
    process.exitCode = 1;
    return;
  }

  const summary = `${result.catalog.tiers.length} tiers, ${result.catalog.categories.length} categories, ${result.catalog.products.length} products, ${result.catalog.picks.length} picks`;
  if (flags.check) {
    console.log(`Checked (${summary})`);
    return;
  }

  const text = `${JSON.stringify(result.catalog, null, 2)}\n`;
  let unchanged = false;
  try {
    unchanged = (await readFile(flags.out, "utf8")) === text;
  } catch {
    unchanged = false;
  }
  await mkdir(path.dirname(flags.out), { recursive: true });
  await writeFile(flags.out, text, "utf8");
  console.log(`Wrote ${flags.out} (${summary})${unchanged ? " (unchanged)" : ""}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof SheetUnreachableError) {
    console.error(`Sheet unreachable, keeping committed catalog.json. ${message}`);
    process.exitCode = 2;
    return;
  }
  console.error(message);
  process.exitCode = 1;
});
