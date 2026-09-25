# Lifestyles

Lifestyles shows one recommended product for everything you buy, at the level you live. Pick a lifestyle and the whole kit is on one screen: clothes, home, tech, and the everyday stuff, already decided.

A lifestyle is a full peer: Budget, Mid, Premium, Organic, and Money is no object are the same kind of thing. The JSON key is still `tiers` (a sheet converter depends on that name, and on the field names `basedOn` and `group`). Everything a person reads says "lifestyle".

Version 1 ships five lifestyles. Budget, Mid, and Premium are `primary`. Organic and Money is no object are `secondary` and coming soon. Only Mid has pick rows, and those are still the TODO seed. There are no accounts, search, reviews, or analytics. The catalog file is the CMS. The lifestyle URLs are `/budget`, `/mid`, `/premium`, `/organic`, and `/money-no-object`.

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

All content lives in [`data/catalog.json`](data/catalog.json). Change a pick, lifestyle, category, or section there. You do not edit React components to add a lifestyle, a section, or a category. `npm run dev` picks the file up on reload. `npm start` serves the last export in `out/` and does not, until you run `npm run build` again.

The file has five top-level fields, in this order: `tiers`, `categories` (tags), `products` (product types), `landing`, and `picks`. The shape is the Google-Sheet converter contract (lib/schema.ts mirrors its schema-v2 exactly), so converter output drops straight in.

### `tiers`

The array is every lifestyle. The key stays `tiers`.

| Field | Meaning |
| --- | --- |
| `id` | URL slug. Lowercase letters and numbers, with single hyphens between parts. No leading, trailing, or doubled hyphen. Surrounding spaces are not trimmed off; a whitespace slug fails this pattern. The page is `/{id}`. Must be unique. The seed ids are `budget`, `mid`, `premium`, `organic`, and `money-no-object`. |
| `name` | Label on the landing card and the lifestyle switcher. Required after trimming. |
| `description` | Required after trimming. The lifestyle page's meta description. The landing card uses it only when `whoFor` is absent. |
| `whoFor` | Optional. One line, trimmed, 1–140 characters, no newlines. Shown on the landing card instead of `description` when present. Omitting the key is valid. An empty string fails. |
| `exampleBrands` | Brand names. Any length, including an empty list. Each entry must be a non-empty string after trimming. Used on the landing card and in the suggester only when `brandChips` is absent. An entry that is exactly `TODO`, or that starts with `TODO:`, in any case and ignoring surrounding spaces, is hidden and is not printed. If none remain, the card shows "Brands coming". A name that merely contains those letters, such as "Todoist", is shown. |
| `brandChips` | Optional string array. Brands for the landing card and the suggester. If the key is absent, `exampleBrands` is used. If the key is present, it is used as-is, even when the array is empty (an empty array shows "Brands coming" and adds no chips, even if `exampleBrands` has names). Each entry must be a non-empty string after trimming. The same `TODO` / `TODO:` skip, and the same "Todoist" exception, as `exampleBrands`. |
| `status` | `live` or `coming_soon` only. Live lifestyles are links to `/{id}` from the landing card, a primary comparison-table header, and the switcher. Coming-soon lifestyles are not links. On the landing card they say "Coming soon". The URL still exists. |
| `group` | `primary` or `secondary`. Optional. Omitted means `primary`. Primary lifestyles are the large landing cards and the segmented switcher. Secondary lifestyles are the smaller landing section and the "More lifestyles" menu. The comparison strip uses primary lifestyles only. The seed sets Budget, Mid, and Premium to `primary`, and Organic and Money is no object to `secondary`. Any other string fails. |
| `basedOn` | Optional slug of another lifestyle in `tiers`. Empty categories inherit that lifestyle's effective pick (see below). It must name an existing id, it cannot name itself, and the chain cannot cycle. |
| `accent` | Hex color `#` plus six digits, such as `#10B981`. Still required and still validated. The UI does not paint it. There is no per-lifestyle green, blue, or navy. |

#### Inheritance

`lib/effective.ts` exports `effectivePicks(catalog, tierId)`. For each category it returns `{ pick, inheritedFrom }`. `pick` is the lifestyle's own pick when the main brand is real. A missing row, or a main brand that is still `TODO` / `TODO:`, uses the effective pick of `basedOn`, walking that chain. `inheritedFrom` is the id of the lifestyle that actually owns the pick, or `null` when this lifestyle owns it or nothing resolved. A cycle resolves to an empty pick instead of looping.

The lifestyle page, the drawer, the kit total, price hints, the landing "typical" price, the full-kit line, and the comparison cells all use that result. A page is never emptier than its base. An inherited card looks the same as an own pick. The drawer adds a quiet line, `Same as Mid`, using the source lifestyle's `name`. Do not add pick rows just to copy a base.

Price hints: a lifestyle with `basedOn` is compared only to that base. If this card's effective pick is that same pick, there is no hint. Other lifestyles are compared using each one's own real main, not an inherited copy, and never against the same pick this card is already showing. A hint is shown only when the compared main is real (a real brand, which always has a price).

```json
{
  "id": "organic",
  "name": "Organic",
  "description": "Organic, low-chemical picks for everything you use.",
  "whoFor": "For people who want organic, low-chemical everyday things",
  "exampleBrands": ["TODO", "TODO", "TODO"],
  "status": "coming_soon",
  "group": "secondary",
  "basedOn": "mid",
  "accent": "#2F6B4F"
}
```

### `landing`

Required object (the sheet's `settings` tab). Both fields name products that exist.

| Field | Meaning |
| --- | --- |
| `anchorProduct` | One product id. Drives the "Typical {product}: $X" line on each lifestyle card, from that lifestyle's effective pick, or `{Product} pick coming`. |
| `compareProducts` | At least one product id. Order is the comparison-table row order. |

An unknown id fails with a readable line, for example `landing.compareProducts[4]: Unknown product "nope"`.

### Landing page

`/` renders, in this order, and nothing else. No feature list, no testimonials, no email capture.

1. A status pill computed from the data, not hard-coded ids. With the seed file it reads `Mid is live · Budget, Premium, Organic, and Money is no object coming soon`. One live lifestyle is `{Name} is live`. Two or more are `{Names} are live` (`A and B`, or `A, B, and C`). Coming-soon names follow the ` · `, then `coming soon`. If none is coming soon, the pill is only the live sentence. If none is live, it starts `No lifestyle is live yet`.
2. Headline: `Pick how you live. We'll tell you what to buy.`
3. Subcopy: `One pick for everything, at your level.`
4. Primary lifestyle cards, in file order, as one grid of large equal cards (one column on a phone, two from 640px, three from 1024px when there are more than two). A count of one or two does not stretch into empty columns. Each card shows the name, then `whoFor` or else `description`, then the brand list or "Brands coming", then the typical anchor price or "{Category name} pick coming", then the full-kit line from effective picks. A live card links to `/{id}`. A coming-soon card is not a link and says "Coming soon".
5. Secondary lifestyles, when any exist, in a smaller section under the heading `Or pick a way of living`. The section is omitted when there are none. Same card facts, smaller type. Coming-soon cards are muted and not links.
6. A comparison table of the primary lifestyles (secondaries are left out). If no lifestyle is primary, the table uses every lifestyle. Rows are `landing.compareProducts`. Coming-soon primary columns stay in the table, muted, with a "Soon" cue, so a single live column still sits beside the others. A cell is the effective pick's thumbnail, brand, name, and mono price, or `Pick coming`. Live column headers link to that lifestyle. Coming-soon headers are not links. The table is a labelled region, scrolls sideways, and keeps the category column stuck. Arrow keys scroll it when the region is focused.
7. A brand suggester. See below.

The full-kit line on the card is not the tier-page sentence. See [How TODO works](#how-todo-works).

### Brand suggester

Chips come from every lifestyle's brand list (`brandChips` if that key is present, otherwise `exampleBrands`). `TODO` entries are skipped. Chips are interleaved across lifestyles in file order (round-robin), not grouped by lifestyle, then deduped by slug. The same slug on two lifestyles is one chip and counts for both. The first label is the one printed.

Each chip is a toggle button with `aria-pressed`. The choice is stored only in the URL, via `history.replaceState`. Example: `?brands=vuori,uniqlo`. Nothing is written to storage. There are no accounts.

Slug rules: trim, lowercase, strip accents, turn `&` into `and`, and turn every other run of non-alphanumerics into a single hyphen. `H&M` becomes `h-and-m`. `Old Navy` becomes `old-navy`.

The lifestyle with the majority of selected chips wins. Each selected chip adds one to every lifestyle that listed it. A tie that includes exactly one live lifestyle picks that live lifestyle. Any other tie is shown, not broken. If the winner is coming soon, the result reads `{Name} is coming soon — see {Live} for now`. The live name is `basedOn` when that lifestyle (or the nearest live lifestyle along the chain) is live. Otherwise it is the first live lifestyle in the file. A live winner reads `You shop like {Name}` and links to that lifestyle. The result is in `aria-live="polite"`. With nothing selected, or no matching chip, it reads `Your closest lifestyle shows up here.`

Without JavaScript the chips still show. A `noscript` note says matching runs in the browser, and that you can still open a lifestyle above.

`?brands=` is built from the page pathname, so a base path such as `/lifestyles` is already in the URL. Do not put that prefix in the catalog.

### `categories` (tags)

Categories act like tags. A product can carry several.

| Field | Meaning |
| --- | --- |
| `id` | Unique slug. Used in the URL as `?cat={id}`. |
| `name` | Chip and section-heading label, e.g. "Kitchen". |
| `order` | Integer; lower sorts first (chips, and section order in the All view). |
| `description` | Optional. |

The special tag `featured` (order 0) is curated by hand: add `featured` to a product's `categories`. When any product carries it, **Featured is the default view** of every lifestyle page ("Your Mid kit: 10 featured picks, …"); otherwise the default is All. `featured` is never a product's `primaryCategory`.

### `products` (product types)

| Field | Meaning |
| --- | --- |
| `id` | Unique slug. Used in the share URL as `?pick={id}` and by picks. |
| `name` | Product type label, e.g. "Everyday tee". |
| `primaryCategory` | The tag it is grouped under in the All view. Must exist and must be in `categories`. |
| `categories` | Tag ids (at least one, always including `primaryCategory`). The product shows under every one of those chips. |
| `order` | Integer sort order within its group. |

### Lifestyle page

Sticky header, one row from 320px up: the wordmark, then the lifestyle switcher.

Primary lifestyles are a segmented control inside a horizontally scrolling pill (`scroll-snap`, hidden scrollbar, fade on both edges when it overflows). Arrow keys scroll it. The selected segment scrolls into view. The selected segment is black with white text. The control is a labelled region, so it can be focused and scrolled from the keyboard.

Secondary lifestyles sit in a compact menu on the button "More lifestyles" (the visible word is "More"; screen readers hear "More lifestyles"). The button has `aria-expanded` and `aria-haspopup="menu"`. The menu is a list of links. Esc closes it and returns focus to the button. Arrow keys move through the items. Clicking outside closes it. When a secondary lifestyle is the current page, that button becomes the black selected pill and shows the lifestyle's name, and the matching menu item has `aria-current="page"`.

Coming-soon primaries in the segmented control are a `span`, not a link, not a tab stop, and not `aria-disabled`. The visible word "Soon" is hidden from assistive tech. Visually hidden text adds `, coming soon`. The current segment, live or not, has `aria-current="page"` and visually hidden `, current page`. Coming-soon items in the More menu use the same "Soon" cue, are not links, and are `aria-disabled` menu items so they are not in the tab order. Every target is at least 44px.

Under the header is the kit summary line for the current view, counted from effective picks (including inherited ones): `Your Mid kit: 10 featured picks, prices coming`, `Your Mid kit: 3 of 250 picks picked, about $X`, or `Kitchen: 44 picks, about $X`.

Below it is a sticky, horizontally scrolling chip bar: Featured (when used), All, then every tag with products, each with its count. Chips are links (`?cat={id}`); a tiny client script swaps a `data-view` attribute on the server-rendered grid, so all 250 cards are static HTML and filtering costs no hydration. `?cat=` combines with `?pick=`; an unknown `?cat` is removed. "All" groups every product under its `primaryCategory` heading. "Only picked" (`?picked=1`, desktop) hides "Pick coming" tiles; it is disabled in a view with nothing picked, so it never empties the page silently. Products without a real pick render as small, quiet "Pick coming" tiles so real picks stand out; they still open the drawer.

A coming-soon URL renders that same grid, plus a short note: `{Name} is coming soon. The slots below match the other lifestyles.` When another lifestyle is live, the note links to it (`See the {Name} kit`). `?pick=` still opens the drawer, including an empty category.

The drawer is a side panel on desktop and a bottom sheet on mobile. It shows the main pick and the alternative. The Buy button is black, opens the retailer in a new tab, and includes an arrow plus screen-reader text `(opens in new tab)`. An empty category shows a designed Pick coming state: the sentence "The [lifestyle] pick for [category] is still being chosen.", plates labeled `Pick coming`, and no Buy button. When the open pick was inherited, a quiet line above the products reads `Same as {source name}`. Focus is trapped. Esc, the backdrop, and the close button dismiss it. Focus returns to the card. The URL stays in sync. `?pick=` is written from the page pathname, so `/lifestyles/mid/?pick=tee` works without a base path inside the catalog. An unknown `?pick=` is removed and does not open a drawer.

When the compared pick is a real, priced main, the card shows a small red hint. A lifestyle with `basedOn` compares only to that base (`Mid: $28` on an Organic card that has its own pick). If the card is showing the pick it inherited from that base, there is no hint. A lifestyle without `basedOn` compares to the other lifestyles' own real mains, and skips a lifestyle whose pick is the one already on the card. A higher price in the same currency is `↑ Premium: $180` (screen readers hear `Upgrade, ` first). A lower price is `↓ Budget: $25` (`Save, `). The same price, a different currency, or no comparable price on this card is `Premium: $180` with no arrow. A TODO main adds no hint. The names and amounts come from the file.

### `picks`

One object per product recommendation. `tier` (the lifestyle id) and `product` must refer to ids that exist. Only one pick per lifestyle and product pair. Picks are sparse: leave a row out when the product has no pick yet (it shows "Pick coming") or when the lifestyle should inherit it via `basedOn`.

`main` is the product on the card. `alt` is the alternative in the drawer. Both are required on every pick, including `alt.when`.

| Field | Meaning |
| --- | --- |
| `brand` | Short brand name. Required and non-empty after trimming. If it is exactly `TODO`, or starts with `TODO:`, in any case and ignoring surrounding spaces, the product is not ready (see below). |
| `name` | Product name. Required and non-empty after trimming. |
| `price` | A finite number greater than or equal to 0, not a string, with at most two decimal places. `28` or `28.5`. Do not include a currency symbol. Signed zero (`-0`) is rejected. Whole numbers format with no cents (`$28`). Any other number uses two decimal places (`$28.50`). Formatting is `Intl.NumberFormat` with locale `en-US` and the pick's currency. `0` is a real price (`$0`), not "unset". An empty card never shows `$0`; it shows an em dash. |
| `currency` | Three uppercase letters that `Intl.supportedValuesOf("currency")` lists, such as `USD`. A lowercase code fails validation. Codes `Intl.NumberFormat` happens to accept, such as `ABC`, are rejected. Real mains written on one lifestyle must share a single currency. Inherited picks are not part of that check. A kit that mixes currencies, including through inheritance, says prices are coming instead of adding them. |
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
- The lifestyle-page kit line counts every category, not a hardcoded 10: `1 thing`, otherwise `things`. The total adds `main.price` for every effective pick whose main brand is not a placeholder, including picks inherited from `basedOn`. `$0` is a real price and is included.
  - Nothing priced yet: `Your Mid kit: 10 things, prices coming`.
  - Every category has a priced (non-placeholder-brand) effective main, one currency: `Your Organic kit: 10 things, about $X total`.
  - One priced main: `Your Mid kit: 10 things, about $X for the 1 pick so far`.
  - Some but not all, more than one: `Your Mid kit: 10 things, about $X for the 3 picks so far`.
  - The lifestyle name, the category count, the priced count, and the formatted sum all come from the file.
- The landing card uses a shorter line from those same effective mains. It does not use the lifestyle name or the word "things".
  - Nothing priced yet: `Kit prices coming`.
  - Every category has a priced main, one currency: `Full kit: about $X`.
  - One priced main: `Full kit: about $X for 1 pick`.
  - Some but not all, more than one: `Full kit: about $X for 3 picks`.
- Two currencies on real mains fail the build instead of hiding either total.

### Add a category tag

Append `{ "id": "garden", "name": "Garden", "order": 55 }` to `categories`, then add `garden` to the `categories` array of the products that belong there. No component changes.

### Add a product

Append `{ "id": "hose", "name": "Garden hose", "primaryCategory": "garden", "categories": ["garden", "outdoors"], "order": 560 }` to `products`. Optionally add picks for it. To show it on the landing table, add its id to `landing.compareProducts`. No component changes.

### Add a lifestyle

Appending one object to `tiers` is enough. `generateStaticParams` exports a page for every id. No component edits.

1. Append an object with a unique `id`, `name`, `description`, `exampleBrands`, `status`, and `accent`. `whoFor`, `brandChips`, `group`, and `basedOn` are optional.
2. Set `group` to `primary` (the default) or `secondary`.
3. Set `basedOn` to another lifestyle id when empty categories should inherit. Do not point it at itself, and do not build a cycle.
4. Add `picks` only for categories that should differ from the base. Omit the row to inherit.

Set `status` to `live` when the landing card, a primary comparison header, and the switcher should link to `/{id}`. `coming_soon` keeps those from being links. The page still shows the shared grid, with a coming-soon note, filled from its own picks plus anything it inherits. `accent` is still required in the file and is not painted. Rebuild so the new `/{id}` page is exported.

```json
{
  "id": "organic",
  "name": "Organic",
  "description": "Organic, low-chemical picks for everything you use.",
  "whoFor": "For people who want organic, low-chemical everyday things",
  "exampleBrands": ["TODO", "TODO", "TODO"],
  "brandChips": ["TODO", "TODO", "TODO"],
  "status": "coming_soon",
  "group": "secondary",
  "basedOn": "mid",
  "accent": "#2F6B4F"
}
```

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

`npm run build` runs `npm run validate` first. A bad file stops the build with one line per problem, for example:

```text
catalog.json is invalid:
  - products[3].primaryCategory: Unknown category "kitchn" (known: featured, clothing, ...)
  - products[3].categories: categories must include primaryCategory
  - landing.compareProducts[4]: Unknown product "nope"
  - picks[0].product: Unknown product "ghost"
  - tiers[3].basedOn: basedOn cycle: organic -> money-no-object -> organic
```

Checks follow CONTRACT.md: strict objects (unknown keys fail), slugs, unique ids, tag/product/lifestyle references, one pick per lifestyle × product, `featured` never primary, `basedOn` existence and cycles, price/currency/URL/image formats, one-line `why`/`alt.when` ≤ 90 chars. Site-only extra check: every pick image must exist under `public/`.

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

Geist and Geist Mono load through `next/font`. The page is white with black ink. Image fields are borderless, 16px radius, on `#F5F5F5`. Prices are mono. Controls are pills. One red, `#D01010`, is used for small highlights: the live dot, the suggester result, upgrade and save hints, "Our pick", and focus. Buy buttons are black. The selected lifestyle segment, including the More button when a secondary lifestyle is the current page, is black with white text. `accent` is not painted.

Motion is about 380ms, `cubic-bezier(.44,0,.56,1)`. `prefers-reduced-motion` disables it. View transitions cross-fade the tier grid only. They do not fade the LCP image on first paint.

## Lighthouse

Target 90 or higher for performance and accessibility on mobile. The page is static. The tier shell is server-rendered. Product copy stays short, and tap targets are at least 44px. Red stays on small highlights and focus, not on body text. Buy buttons are black. The selected switcher segment is black with white text.
