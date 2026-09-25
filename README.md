# Lifestyles

Lifestyles shows one recommended product for everything you buy, at the level you live. Pick a tier and the whole kit is on one screen: clothes, home, tech, and the everyday stuff, already decided.

Version 1 has the full site for three tiers. Only one tier is filled in. The other two are a coming-soon state. There are no accounts, search, reviews, or analytics. The catalog file is the CMS. The tier URLs are `/budget`, `/mid`, and `/premium`.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production build writes static HTML to `out/`:

```bash
npm run build
npm start          # serves the out/ folder (the serve package)
npx serve out      # same preview, without a project install of serve
```

`npm run build` checks `data/catalog.json` before Next compiles (`prebuild` runs `npm run validate`). `output: 'export'` in `next.config.ts` writes a static site. `npm start` is a static preview, not `next start` (that command cannot serve an export). `tsx` and `serve` are production dependencies, so `npm install --omit=dev` can still validate the catalog and serve `out/`.

```bash
npm run validate   # check the catalog only
npm run lint
```

## Edit the catalog

All content lives in [`data/catalog.json`](data/catalog.json). Change a pick, tier, category, or section there. You do not edit React components to add a tier, a section, or a category. `npm run dev` picks the file up on reload. `npm start` serves the last export in `out/` and does not, until you run `npm run build` again.

The file has five top-level fields: `tiers`, `sections`, `categories`, `landing`, and `picks`.

### `tiers`

| Field | Meaning |
| --- | --- |
| `id` | URL slug. Lowercase letters and numbers, with single hyphens between parts. No leading, trailing, or doubled hyphen. Surrounding spaces are not trimmed off; a whitespace slug fails this pattern. The page is `/{id}`. Must be unique. The seed ids are `budget`, `mid`, and `premium`. |
| `name` | Label on the landing card and the tier switcher. Required after trimming. |
| `description` | Required after trimming. The tier page's meta description. The landing card uses it only when `whoFor` is absent. |
| `whoFor` | Optional. One line, trimmed, 1–140 characters, no newlines. Shown on the landing card instead of `description` when present. Omitting the key is valid. An empty string fails. |
| `exampleBrands` | Brand names. Any length, including an empty list. Each entry must be a non-empty string after trimming. Used on the landing card and in the suggester only when `brandChips` is absent. An entry that is exactly `TODO`, or that starts with `TODO:`, in any case and ignoring surrounding spaces, is hidden and is not printed. If none remain, the card shows "Brands coming". A name that merely contains those letters, such as "Todoist", is shown. |
| `brandChips` | Optional string array. Brands for the landing card and the suggester. If the key is absent, `exampleBrands` is used. If the key is present, it is used as-is, even when the array is empty (an empty array shows "Brands coming" and adds no chips, even if `exampleBrands` has names). Each entry must be a non-empty string after trimming. The same `TODO` / `TODO:` skip, and the same "Todoist" exception, as `exampleBrands`. |
| `status` | `live` or `coming_soon` only. Live tiers are links to `/{id}` from the landing card, the comparison-table header, and the switcher. Coming-soon tiers are not links. On the landing card they say "Coming soon". The URL still exists. |
| `accent` | Hex color `#` plus six digits, such as `#10B981`. Still required and still validated. The UI does not paint it. There is no per-tier green, blue, or navy. |

### `landing`

Required object. Both fields are slugs of categories that exist.

| Field | Meaning |
| --- | --- |
| `anchorCategory` | One category slug. Drives the "Typical {category name}: $X" line on each tier card. The category name is lowercased, so "Everyday tee" becomes `Typical everyday tee: $28`. If that tier's main pick is missing or still TODO, the card says `{Category name} pick coming` in the name's stored capitalization, such as `Everyday tee pick coming`. |
| `compareCategories` | At least one category slug. Order is the comparison-table row order. Duplicates fail. |

An unknown id fails with a readable line, for example `landing.compareCategories[0]: Unknown category "nope"` and `landing.anchorCategory: Unknown category "nope"`. A repeated slug fails with `Duplicate category "tee" (also at landing.compareCategories[0])`.

### Landing page

`/` renders, in this order, and nothing else. No feature list, no testimonials, no email capture.

1. A status pill computed from the data, not hard-coded ids. With the seed file it reads `Mid is live · Budget and Premium coming soon`. One live tier is `{Name} is live`. Two or more are `{Names} are live` (`A and B`, or `A, B, and C`). Coming-soon names follow the ` · `, then `coming soon`. If none is coming soon, the pill is only the live sentence. If none is live, it starts `No tier is live yet`.
2. Headline: `Pick how you live. We'll tell you what to buy.`
3. Subcopy: `One pick for everything, at your level.`
4. One card per tier, in file order. Each card shows the name, then `whoFor` or else `description`, then the brand list or "Brands coming", then the typical anchor price or "{Category name} pick coming", then the full-kit line below. A live card links to `/{id}`. A coming-soon card is not a link and says "Coming soon".
5. A comparison table. Rows are `landing.compareCategories`. Columns are the tiers in file order. A cell is a thumbnail, brand, name, and mono price, or `Pick coming`. Live column headers link to that tier. Coming-soon headers are not links. The table scrolls sideways, with the category column stuck on small screens.
6. A brand suggester. See below.

The full-kit line on the card is not the tier-page sentence. See [How TODO works](#how-todo-works).

### Brand suggester

Chips come from every tier's brand list (`brandChips` if that key is present, otherwise `exampleBrands`). `TODO` entries are skipped. Chips are interleaved across tiers in file order (round-robin), not grouped by tier, then deduped by slug. The same slug on two tiers is one chip and counts for both tiers. The first label is the one printed.

Each chip is a toggle button with `aria-pressed`. The choice is stored only in the URL, via `history.replaceState`. Example: `?brands=vuori,uniqlo`. Nothing is written to storage. There are no accounts.

Slug rules: trim, lowercase, strip accents, turn `&` into `and`, and turn every other run of non-alphanumerics into a single hyphen. `H&M` becomes `h-and-m`. `Old Navy` becomes `old-navy`.

The tier with the majority of selected chips wins. Each selected chip adds one to every tier that listed it. A tie that includes exactly one live tier picks that live tier. Any other tie is shown, not broken. If the winner is coming soon, the result reads `{Name} is coming soon — see {Live} for now`, and the live name is the link. A live winner reads `You shop like {Name}` and links to that tier. The result is in `aria-live="polite"`. With nothing selected, or no matching chip, it reads `Your closest tier shows up here.`

Without JavaScript the chips still show. A `noscript` note says matching runs in the browser.

`?brands=` is built from the page pathname, so a base path such as `/lifestyles` is already in the URL. Do not put that prefix in the catalog.

### `sections`

Ordered list of group names, for example `"Wear"`. Each name is required after trimming and must be unique, including names that differ only by case (`"Wear"` and `"wear"` are a duplicate). A section with no categories is skipped. Each section is one heading and its own cards. The heading id is `section-` plus that section's index in this array (`section-0`), not a slug of the label, so `"Home"` and `"Home!"` do not share an id. A duplicate heading id fails the build.

Every tier uses the same slots: the same categories, the same order, grouped by section. The grid is one tree. Two columns on phones, three from 768px, four from 1024px. From 1280px the same cells pack into five columns: the earliest section anchors a row, and a later section can fill a leftover gap when it fits on that same row. A section longer than five cards wraps inside its own block. Below 1280px the sections stay in catalog order, each heading on its own row. Nothing in the components hard-codes section names or counts. Adding a section is still only a JSON edit.

### `categories`

| Field | Meaning |
| --- | --- |
| `id` | Unique slug, same rules as a tier id. Used in the share URL as `?pick={id}`. |
| `name` | The category label, such as "Everyday tee". On a filled card the meta row is `{Brand} · {name}`. On an empty card it is `{Section} · {name}`. |
| `section` | Must match a name in `sections` exactly, including case, after trimming. |

### Tier page

Sticky header: the wordmark, then a segmented tier switcher. The selected segment is black with white text. The switcher stays one row at 320–375px.

Coming-soon tiers in the switcher are a `span`, not a link, not a tab stop, and not `aria-disabled`. The visible word "Soon" is hidden from assistive tech. Visually hidden text adds `, coming soon` so the accessible name includes it at every width. The current segment, live or not, has `aria-current="page"` and visually hidden `, current page`.

Under the header is the kit summary line (`Your {name} kit: …`). Then the category grid.

A coming-soon URL renders that same grid, plus a short note: `{Name} is coming soon. The slots below match the other tiers.` When another tier is live, the note links to it (`See the {Name} kit`). `?pick=` still opens the drawer, including an empty category.

The drawer is a side panel on desktop and a bottom sheet on mobile. It shows the main pick and the alternative. The Buy button is black, opens the retailer in a new tab, and includes an arrow plus screen-reader text `(opens in new tab)`. An empty category shows a designed Pick coming state: the sentence "The [tier] pick for [category] is still being chosen.", plates labeled `Pick coming`, and no Buy button. Focus is trapped. Esc, the backdrop, and the close button dismiss it. Focus returns to the card. The URL stays in sync. `?pick=` is written from the page pathname, so `/lifestyles/mid/?pick=tee` works without a base path inside the catalog. An unknown `?pick=` is removed and does not open a drawer.

When another tier has a real main for the same category, the card shows a small red hint. A higher price in the same currency is `↑ Premium: $180` (screen readers hear `Upgrade, ` first). A lower price is `↓ Budget: $25` (`Save, `). The same price, a different currency, or no comparable price on this card is `Premium: $180` with no arrow. A TODO main on the other tier adds no hint. The names and amounts come from the file.

### `picks`

One object per product recommendation. `tier` and `category` must refer to ids that exist. Only one pick per tier and category pair.

`main` is the product on the card. `alt` is the alternative in the drawer. Both are required on every pick, including `alt.when`.

| Field | Meaning |
| --- | --- |
| `brand` | Short brand name. Required and non-empty after trimming. If it is exactly `TODO`, or starts with `TODO:`, in any case and ignoring surrounding spaces, the product is not ready (see below). |
| `name` | Product name. Required and non-empty after trimming. |
| `price` | A finite number greater than or equal to 0, not a string, with at most two decimal places. `28` or `28.5`. Do not include a currency symbol. Signed zero (`-0`) is rejected. Whole numbers format with no cents (`$28`). Any other number uses two decimal places (`$28.50`). Formatting is `Intl.NumberFormat` with locale `en-US` and the pick's currency. `0` is a real price (`$0`), not "unset". An empty card never shows `$0`; it shows an em dash. |
| `currency` | Three uppercase letters that `Intl.supportedValuesOf("currency")` lists, such as `USD`. A lowercase code fails validation. Codes `Intl.NumberFormat` happens to accept, such as `ABC`, are rejected. Real mains in one tier must share a single currency. |
| `url` | Retailer link. Must be an absolute `http:` or `https:` URL. `https://TODO` is allowed only while the brand is still a placeholder. A real brand with hostname `todo` fails the build (`Expected a retailer http(s) URL`). A normal URL whose path contains the letters "todo" is valid and is a Buy link. `javascript:` fails the build. |
| `image` | Must start with `/images/`, contain only letters, numbers, `.`, `_`, `/`, and `-`, and must not contain `..`. Whitespace is not trimmed. The file must exist at `public` plus that path, or the build fails with `File not found at public/images/...`. The real path, after resolving symlinks, must stay inside `public/`. `public/images/placeholder.svg` must exist even when no pick references it. Example: `/images/tee.jpg` is the file `public/images/tee.jpg`. Do not put a deploy prefix in this field. |
| `why` | One line, no newline characters. Required, at most 90 characters after trimming. Shown in the drawer, not on the category card. |
| `alt.when` | Required on the alternative. One line, no newline characters, at most 90 characters after trimming. Shown under the "Alternative" label in the drawer. It does not fall back to another label because it was omitted. Validation rejects a TODO note once `alt.brand` is a real brand. |

### How TODO works

Seed picks use a placeholder so real products are never invented. Do not replace `TODO` with made-up products.

A brand is a placeholder when it trims to exactly `TODO`, or starts with `TODO:` (any capitalization). Validation already requires a non-empty brand, so the value you will type is `TODO`. A `TODO:` brand is the same placeholder, not a blank brand line.

- A placeholder main renders as an empty card, and so does a category with no pick. There is no big numeral. The image field is a `#F5F5F5` plate with a short centered line. The meta row is `Section · Category`. The name is `Pick coming`. The price is an em dash, never `$0` and never the word TODO. Screen readers hear "Price coming" instead of the dash. The card is still a button on every tier, live or coming soon. `?pick={category id}` opens a drawer with plates labeled `Pick coming` and the sentence "The [tier] pick for [category] is still being chosen." There is no Buy button and no fake product.
- A real main shows its photo in that same field, the meta row `Brand · Category`, the product name, and a mono price. `why` stays in the drawer.
- `alt.brand` of `TODO` or `TODO:` hides the alternative column. The drawer shows only the main pick.
- An alternative whose brand is real while the main brand is still a placeholder fails the build: `alternative is set while the main brand is still TODO`.
- Unfinished copy is the exact word `TODO`, or a note that starts with `TODO:` (any case, after trimming). `Todo Wool Tee` is not unfinished. Strings that merely contain "todo" are shown.
- If `brand` is a real brand and `name`, `why`, or `alt.when` is still unfinished, the build fails: `picks[3].main.name: is still TODO but brand is set`. A real brand whose URL is still `https://TODO` fails with `Expected a retailer http(s) URL`. A fully placeholder product (brand `TODO`, with TODO notes in the other fields) is valid. That is the seed.
- Objects are strict. An unknown key fails with Zod's `Unrecognized key(s)` message on that object's path, instead of being stripped.
- The tier-page kit line counts every category, not a hardcoded 10: `1 thing`, otherwise `things`. The total adds `main.price` only for that tier's picks whose main brand is not a placeholder. `$0` is a real price and is included.
  - Nothing priced yet: `Your Mid kit: 10 things, prices coming`.
  - Every category has a priced (non-placeholder-brand) main, one currency: `Your Mid kit: 10 things, about $X total`.
  - One priced main: `Your Mid kit: 10 things, about $X for the 1 pick so far`.
  - Some but not all, more than one: `Your Mid kit: 10 things, about $X for the 3 picks so far`.
  - The tier name, the category count, the priced count, and the formatted sum all come from the file.
- The landing card uses a shorter line from those same priced mains. It does not use the tier name or the word "things".
  - Nothing priced yet: `Kit prices coming`.
  - Every category has a priced main, one currency: `Full kit: about $X`.
  - One priced main: `Full kit: about $X for 1 pick`.
  - Some but not all, more than one: `Full kit: about $X for 3 picks`.
- Two currencies on real mains fail the build instead of hiding either total.

### Add a section

1. Append a unique, non-empty name to `sections`. Place it where it should appear on the tier page.
2. Point categories at that name with an exact `section` match.

No component changes. A section that no category uses is left off the page.

### Add a category

1. Add a name to `sections` if it needs a new group.
2. Append a category object with a new `id`, `name`, and `section`.
3. Optionally append a pick for each tier that should show a product. A tier with no pick shows "Pick coming" and still opens from `?pick=`.
4. To show it on the landing table, append its id to `landing.compareCategories`. To use it for the typical-price line, set `landing.anchorCategory`. Both must name a category that exists.

No component changes. The grid, the count in the kit line, and the `?pick=` links follow the file.

### Add a tier

1. Append a tier object with a unique `id`, `name`, `description`, `exampleBrands`, `status`, and `accent`. `whoFor` and `brandChips` are optional.
2. Add `picks` whose `tier` is that id, one per category you want filled in.

Set `status` to `live` when the landing card, the comparison header, and the switcher should link to `/{id}`. `coming_soon` keeps those from being links. The tier page still shows the shared grid, with a coming-soon note. `accent` is still required in the file and is not painted. Rebuild so the new `/{id}` page is exported.

### Add an image

Put the file in `public/images/` and set `image` to a path such as `/images/your-file.jpg` (see the path rules above). Do not put a deploy prefix in that field. The file must exist at `public` plus that path, or the build fails with `File not found`. A neutral placeholder is already at `public/images/placeholder.svg`. The build requires that file even after every pick has its own photo, because a missing image at runtime falls back to it. A missing file does not fall back during the build. Keep the placeholder.

`output: 'export'` does not resize images. The `<img>` sets `sizes` from the real slot: five columns inside the 1440px frame from 1280px (`calc((min(100vw, 1440px) - 96px) / 5)`), four from 1024px (`calc((min(100vw, 1440px) - 88px) / 4)`), three from 768px (`calc((100vw - 64px) / 3)`), and two below that (`calc((100vw - 40px) / 2)`). The drawer uses `312px` from 1024px up, half the sheet from 600px, and the sheet width below that. `sizes` does nothing until the image has a `srcset`. To add responsive files, place width variants next to the original:

```text
public/images/tee.jpg
public/images/tee-480w.jpg
public/images/tee-960w.jpg
public/images/tee-1440w.jpg
```

The build reads each file's pixel width (PNG, GIF, JPEG, or VP8X WebP). A sibling is emitted in `srcset` only when that width matches the suffix (`tee-960w.jpg` must be 960 pixels wide). A mismatch, or a variant whose width cannot be read, fails the build and is left out of `srcset`. When at least one sibling is valid, the original is included too, at its decoded width. SVGs, including the placeholder, are a single file. Without variants, the browser downloads the file you named in `image`. That file must be at most 1440 pixels wide, or the build fails and tells you to add the three siblings or export a smaller file. A photo around 960 pixels wide covers a phone; 1440 covers a large desktop card. The card and the drawer show the image contained in a square field, not cropped. `width` and `height` on the `<img>` are 1200 and 900; the CSS box is what lays the slot out. Each product image is in the page once. Picked images on the desktop first row load eagerly, and only the first of those uses `fetchpriority="high"`. The rest load lazily. If a file 404s in the browser, `srcset` and `sizes` are cleared and the image falls back to `public/images/placeholder.svg`. Decoding is async. Do not point `image` at a symlink that leaves `public/`.

## Validation

`npm run validate` (and `npm run build`, via `prebuild`) parses the file with zod, then checks references, unfinished copy, URLs, currencies, and image files. A bad file stops the build. Each problem is one line: the JSON path, then the message. Reference and content problems are listed even when other fields have the wrong type.

```text
catalog.json is invalid:
  - picks[0].main.price: Expected number, received string
  - categories[3].section: Unknown section "Garden"
  - picks[2].tier: Unknown tier "luxury"
  - tiers[1].id: Duplicate tier id "mid" (also at tiers[0].id)
  - sections[1]: Duplicate section "Wear" (also at sections[0])
  - picks[1]: Duplicate pick for tier "mid" and category "tee" (also at picks[0])
  - picks[3].main.name: is still TODO but brand is set
  - picks[0].main.url: Expected an http(s) URL
  - picks[0].main.image: File not found at public/images/missing.jpg
  - picks[0].main.image: Image is 2000px wide with no width variants; add tee-480w.jpg, tee-960w.jpg, and tee-1440w.jpg or use a file at most 1440px wide
  - picks[0].main.image: Width variant public/images/tee-960w.jpg is 2000px wide, not 960
  - picks: Tier "mid" uses more than one currency (EUR, USD)
  - tiers[0].whoFor: Expected at most 140 characters
  - landing.anchorCategory: Unknown category "nope"
  - landing.compareCategories[0]: Unknown category "nope"
  - landing.compareCategories[1]: Duplicate category "tee" (also at landing.compareCategories[0])
```

If the file cannot be read or is not JSON, the path is `(root)` and the message is the parser error:

```text
catalog.json is invalid:
  - (root): Expected property name or '}' in JSON at position 1
```

Checked failures include missing or whitespace-only required fields (they fail after trim with `Required`), wrong types, unknown object keys (`Unrecognized key(s) in object: …`), a price that is not a finite number greater than or equal to 0, signed zero, a price with more than two decimal places, a currency that is not three uppercase letters listed by `Intl.supportedValuesOf("currency")`, an image path that does not start with `/images/` or that contains `..`, a missing image file (`File not found`), a missing `public/images/placeholder.svg`, an image path or symlink that resolves outside `public/`, `why` or `alt.when` longer than 90 characters after trim or containing a newline, `whoFor` longer than 140 characters after trim or containing a newline (`Expected at most 140 characters`, `Expected a single line`), a `brandChips` entry that is empty after trim, an accent that is not `#` plus six hex digits (validated, not painted), a status other than `live` or `coming_soon`, a slug that is not lowercase (whitespace is not trimmed into a valid slug), a URL that is not `http:` or `https:` (`javascript:` fails; `https://TODO` is allowed on a placeholder brand and rejected on a real brand; a path that merely contains "todo" is still valid), a real brand whose name, why, or `alt.when` is still `TODO` or a `TODO:` note, an alternative set while the main brand is still TODO, more than one currency among a tier's real mains, duplicate tier ids, duplicate section names (including case-only differences), duplicate section heading ids, duplicate category ids, duplicate picks for the same tier and category, a category whose section does not exist, a pick whose tier or category does not exist, `landing.anchorCategory` or a `landing.compareCategories` entry that is not an existing category, a duplicate in `landing.compareCategories`, an empty `compareCategories` list (`Expected at least one category`), a raster wider than 1440px with no width variants, and a width variant whose pixel width does not match its `-480w` / `-960w` / `-1440w` suffix.

## Deploy

The site is a static export (`output: 'export'` in `next.config.ts`). There is no server and no database. `trailingSlash: true` writes each route as a directory (`mid/index.html`), so `/mid` and `/mid/` both resolve. A shared pick link keeps its query (`/mid/?pick=tee`).

`PAGES_BASE_PATH` is optional. Leave it unset (empty) for a site at the domain root. Set it to a path such as `/lifestyles` when the site is served from a subpath. The value is also exposed as `NEXT_PUBLIC_BASE_PATH`. Links and the `?pick=` and `?brands=` queries use the page pathname, so the prefix is already in the URL. Catalog image fields stay `/images/...` with no prefix; the page adds the base path when it renders. The build still checks those files under `public/` with no prefix. `public/.nojekyll` is included so GitHub Pages serves `_next/`.

### GitHub Pages

`.github/workflows/pages.yml` builds and deploys on every push to `main`, and when you run the workflow by hand.

1. In the repo settings, open Pages and set the source to **GitHub Actions**.
2. Push to `main`, or run the "Deploy GitHub Pages" workflow.
3. The build sets `PAGES_BASE_PATH` to `/${{ github.event.repository.name }}`, so a project site at `https://<user>.github.io/<repo>/` works whatever the repository is named.

The workflow checks out the repo, installs Node 20 with `npm ci`, runs `npm run build`, and uploads the `out/` directory. A second job deploys that artifact to the `github-pages` environment.

**Custom domain.** If Pages is serving the repository at the apex of a domain (`https://example.com/`) rather than under `/<repo>/`, clear the base path: change the workflow env `PAGES_BASE_PATH` to an empty string (or delete it) and run the workflow again. A project site needs the prefix; a custom domain at the root does not.

### Vercel

Leave `PAGES_BASE_PATH` unset. Import the repo at [vercel.com/new](https://vercel.com/new). Framework preset: Next.js. Leave the build command as `npm run build`. Do not set an output directory. Vercel serves the export with zero extra config. Or from the repo root: `npx vercel`.

No analytics snippet.

## Look

Geist and Geist Mono load through `next/font`. The page is white with black ink. Image fields are borderless, 16px radius, on `#F5F5F5`. Prices are mono. Controls are pills. One red, `#D01010`, is used for small highlights: the live dot, the suggester result, upgrade and save hints, "Our pick", and focus. Buy buttons are black. The selected tier-switcher segment is black with white text.

Motion is about 380ms, `cubic-bezier(.44,0,.56,1)`. `prefers-reduced-motion` disables it. View transitions cross-fade the tier grid only. They do not fade the LCP image on first paint.

## Lighthouse

Target 90 or higher for performance and accessibility on mobile. The page is static. The tier shell is server-rendered. Product copy stays short, and tap targets are at least 44px. Red stays on small highlights and focus, not on body text. Buy buttons are black. The selected switcher segment is black with white text.
