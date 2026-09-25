# Lifestyles

Lifestyles shows one recommended product for everything you buy, at the level you live. Pick a tier and the whole kit is on one screen: clothes, home, tech, and the everyday stuff, already decided.

Version 1 has the full site for three tiers. Only one tier is filled in. The other two are a coming-soon state. There are no accounts, search, reviews, or analytics. The catalog file is the CMS.

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

All content lives in [`data/catalog.json`](data/catalog.json). Change a pick, tier, category, or section there and reload. You do not edit React components to add a tier, a section, or a category.

The file has four top-level fields: `tiers`, `sections`, `categories`, and `picks`.

### `tiers`

| Field | Meaning |
| --- | --- |
| `id` | URL slug. Lowercase letters and numbers, with single hyphens between parts. No leading, trailing, or doubled hyphen. Surrounding spaces are not trimmed off; a whitespace slug fails this pattern. The page is `/{id}`. Must be unique. |
| `name` | Label on the landing card and the tier switcher. Required after trimming. |
| `description` | One line under the name. Required after trimming. |
| `exampleBrands` | Brand names on the landing card. Any length, including an empty list. Each entry must be a non-empty string after trimming. An entry that is exactly `TODO`, or that starts with `TODO:`, in any case and ignoring surrounding spaces, is hidden and is not printed. If none remain, the card shows a muted "Brands coming" line. A name that merely contains those letters, such as "Todoist", is shown. |
| `status` | `live` or `coming_soon` only. Live tiers are links to `/{id}`. Coming-soon tiers are not links, in the page or in the switcher. On the landing card they are muted and say "Coming soon". In the switcher they are a disabled `span` (not a link): a dotted underline, the word "Soon" from the `sm` breakpoint up, and visually hidden "coming soon" text. The URL still exists and shows a coming-soon page inside the same top bar. Picks for a coming-soon tier are not listed, and `?pick=` does not open a drawer there. |
| `accent` | Hex color `#` plus six digits, such as `#10B981`. Used once in the tier header, as a 2px rule on the kit strip, and on the live landing card. Buy buttons use a darkened accent so white text clears 4.5:1. The selected switcher segment uses an ink ring, not a second green. |

### `sections`

Ordered list of group names, for example `"Wear"`. Each name is required after trimming and must be unique, including names that differ only by case (`"Wear"` and `"wear"` are a duplicate). This order is the reading order below 1024px. A section with no categories is skipped. Each section is one heading and its own cards. Below 1024px every section is its own block (two columns, a short last row is fine). From 1024px up, whole sections are packed into a 5-column grid: the earliest section anchors a row, and a later section can fill a leftover gap when it fits on that same row. A section longer than five cards wraps inside its own block. The heading's rule spans exactly that section's columns. Nothing in the components hard-codes section names or counts. Adding a section is still only a JSON edit.

### `categories`

| Field | Meaning |
| --- | --- |
| `id` | Unique slug, same rules as a tier id. Used in the share URL as `?pick={id}`. |
| `name` | The category label on the card, such as "Everyday tee". It can wrap. |
| `section` | Must match a name in `sections` exactly, including case, after trimming. |

### `picks`

One object per product recommendation. `tier` and `category` must refer to ids that exist. Only one pick per tier and category pair.

`main` is the product on the card. `alt` is the alternative in the drawer. Both are required on every pick, including `alt.when`.

| Field | Meaning |
| --- | --- |
| `brand` | Short brand name. Required and non-empty after trimming. If it is exactly `TODO`, or starts with `TODO:`, in any case and ignoring surrounding spaces, the product is not ready (see below). |
| `name` | Product name. Required and non-empty after trimming. |
| `price` | A finite number greater than or equal to 0, not a string, with at most two decimal places. `28` or `28.5`. Do not include a currency symbol. Signed zero (`-0`) is rejected. Whole numbers format with no cents (`$28`). Any other number uses two decimal places (`$28.50`). Formatting is `Intl.NumberFormat` with locale `en-US` and the pick's currency. `0` is a real price (`$0`), not "unset". |
| `currency` | Three uppercase letters that `Intl.supportedValuesOf("currency")` lists, such as `USD`. A lowercase code fails validation. Codes `Intl.NumberFormat` happens to accept, such as `ABC`, are rejected. Real mains in one tier must share a single currency. |
| `url` | Retailer link. Must be an absolute `http:` or `https:` URL. `https://TODO` is allowed only while the brand is still a placeholder. A real brand with hostname `todo` fails the build (`Expected a retailer http(s) URL`). A normal URL whose path contains the letters "todo" is valid and is a Buy link. `javascript:` fails the build. |
| `image` | Must start with `/images/`, contain only letters, numbers, `.`, `_`, `/`, and `-`, and must not contain `..`. Whitespace is not trimmed. The file must exist at `public` plus that path, or the build fails with `File not found at public/images/...`. The real path, after resolving symlinks, must stay inside `public/`. `public/images/placeholder.svg` must exist even when no pick references it. Example: `/images/tee.jpg` is the file `public/images/tee.jpg`. |
| `why` | One line, no newline characters. Required, at most 90 characters after trimming. The card shows at most two lines and ellipsizes past that. |
| `alt.when` | Required on the alternative. One line, no newline characters, at most 90 characters after trimming. Shown under the "Alternative" label in the drawer. It does not fall back to another label because it was omitted. Validation rejects a TODO note once `alt.brand` is a real brand. |

### How TODO works

Seed picks use a placeholder so real products are never invented. Do not replace `TODO` with made-up products.

A brand is a placeholder when it trims to exactly `TODO`, or starts with `TODO:` (any capitalization). Validation already requires a non-empty brand, so the value you will type is `TODO`. A `TODO:` brand is the same placeholder, not a blank brand line.

- A placeholder main renders as an empty card: the category name, a reserved plate (a catalog number from the category's place in the file, not a broken-image icon), and "Pick coming". Rows for brand, price, and why stay reserved so the card is the same size as a filled neighbor. A category with no pick does the same. On a live tier the card is still a button, and `?pick={category id}` opens a drawer with the same reserved plates and the sentence "The [tier] pick for [category] is still being chosen." There is no Buy button and no fake product.
- `alt.brand` of `TODO` or `TODO:` hides the alternative column. The drawer shows only the main pick.
- An alternative whose brand is real while the main brand is still a placeholder fails the build: `alternative is set while the main brand is still TODO`.
- Unfinished copy is the exact word `TODO`, or a note that starts with `TODO:` (any case, after trimming). `Todo Wool Tee` is not unfinished. Strings that merely contain "todo" are shown.
- If `brand` is a real brand and `name`, `why`, or `alt.when` is still unfinished, the build fails: `picks[3].main.name: is still TODO but brand is set`. A real brand whose URL is still `https://TODO` fails with `Expected a retailer http(s) URL`. A fully placeholder product (brand `TODO`, with TODO notes in the other fields) is valid. That is the seed.
- Objects are strict. An unknown key fails with Zod's `Unrecognized key(s)` message on that object's path, instead of being stripped.
- The kit line counts every category, not a hardcoded 10: `1 thing`, otherwise `things`. The total adds `main.price` only for that tier's picks whose main brand is not a placeholder. `$0` is a real price and is included.
  - Nothing priced yet: `Your Mid kit: 10 things, prices coming`.
  - Every category has a priced (non-placeholder-brand) main, one currency: `Your Mid kit: 10 things, about $X total`.
  - One priced main: `Your Mid kit: 10 things, about $X for the 1 pick so far`.
  - Some but not all, more than one: `Your Mid kit: 10 things, about $X for the 3 picked so far`.
  - The tier name, the category count, the priced count, and the formatted sum all come from the file. Two currencies on real mains fail the build instead of hiding the total.

### Add a section

1. Append a unique, non-empty name to `sections`. Place it where it should appear on the tier page.
2. Point categories at that name with an exact `section` match.

No component changes. A section that no category uses is left off the page.

### Add a category

1. Add a name to `sections` if it needs a new group.
2. Append a category object with a new `id`, `name`, and `section`.
3. Optionally append a pick for each tier that should show a product. A live tier with no pick shows "Pick coming" and still opens from `?pick=`.

No component changes. The grid, the count in the kit line, and the `?pick=` links follow the file.

### Add a tier

1. Append a tier object with a unique `id`, `name`, `description`, `exampleBrands`, `status`, and `accent`.
2. Add `picks` whose `tier` is that id, one per category you want filled in.

Set `status` to `live` when the landing card should link to `/{id}` and the tier page should show the kit. `coming_soon` keeps the card muted and the tier page as a coming-soon state. Rebuild so the new `/{id}` page is exported.

### Add an image

Put the file in `public/images/` and set `image` to a path such as `/images/your-file.jpg` (see the path rules above). The file must exist at `public` plus that path, or the build fails with `File not found`. A neutral placeholder is already at `public/images/placeholder.svg`. The build requires that file even after every pick has its own photo, because a missing image at runtime falls back to it. A missing file does not fall back during the build. Keep the placeholder.

`output: 'export'` does not resize images. The `<img>` sets `sizes` to match the grid (`(min-width: 1024px) 18vw, 45vw` on cards; the drawer uses `(min-width: 1024px) 320px, (min-width: 600px) 42vw, 88vw`). `sizes` does nothing until the image has a `srcset`. To add responsive files, place width variants next to the original:

```text
public/images/tee.jpg
public/images/tee-480w.jpg
public/images/tee-960w.jpg
public/images/tee-1440w.jpg
```

The build detects those three widths and emits `srcset`. When it can read the original's pixel width (PNG, GIF, JPEG, or a VP8X WebP), it includes the original in that `srcset` too. SVGs, including the placeholder, are used as a single file. Without variants, the browser downloads the file you named in `image`, so export a photo around 960 pixels wide for a phone and about 1440 for a large desktop card. For a sharp 2x phone card (the slot is about 180 CSS pixels), a 480w file is enough; keep a 960w or 1440w file for desktop. Images are 4:3 and contained, not cropped. `width` and `height` on the `<img>` are only the 4:3 ratio (1200×900); the CSS box is what lays the card out. The first two cards that actually have a pick load eagerly, and only the first of those uses `fetchpriority="high"`. The rest load lazily. Decoding is async. Do not point `image` at a symlink that leaves `public/`.

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
  - picks: Tier "mid" uses more than one currency (EUR, USD)
```

If the file cannot be read or is not JSON, the path is `(root)` and the message is the parser error:

```text
catalog.json is invalid:
  - (root): Expected property name or '}' in JSON at position 1
```

Checked failures include missing or whitespace-only required fields (they fail after trim with `Required`), wrong types, unknown object keys (`Unrecognized key(s) in object: …`), a price that is not a finite number greater than or equal to 0, signed zero, a price with more than two decimal places, a currency that is not three uppercase letters listed by `Intl.supportedValuesOf("currency")`, an image path that does not start with `/images/` or that contains `..`, a missing image file (`File not found`), a missing `public/images/placeholder.svg`, an image path or symlink that resolves outside `public/`, `why` or `alt.when` longer than 90 characters after trim or containing a newline, an accent that is not `#` plus six hex digits, a status other than `live` or `coming_soon`, a slug that is not lowercase (whitespace is not trimmed into a valid slug), a URL that is not `http:` or `https:` (`javascript:` fails; `https://TODO` is allowed on a placeholder brand and rejected on a real brand; a path that merely contains "todo" is still valid), a real brand whose name, why, or `alt.when` is still `TODO` or a `TODO:` note, an alternative set while the main brand is still TODO, more than one currency among a tier's real mains, duplicate tier ids, duplicate section names (including case-only differences), duplicate category ids, duplicate picks for the same tier and category, a category whose section does not exist, and a pick whose tier or category does not exist.

## Deploy on Vercel

The project is a static export (`output: 'export'` in `next.config.ts`) and needs no server, database, or environment variables.

- Import the repo at [vercel.com/new](https://vercel.com/new). Framework preset: Next.js. Leave the build command as `npm run build`. Do not set an output directory. Vercel serves the export with zero extra config.
- Or from the repo root: `npx vercel`.

No analytics snippet, no extra config.

## Lighthouse

Target 90 or higher for performance and accessibility on mobile. The page is static. The tier shell is server-rendered. Product copy stays short, tap targets are at least 44px, and the accent stays on the live card edge, the kit strip, and Buy buttons rather than on body text. The switcher uses an ink ring so the header does not stack two greens.
