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

`npm run build` checks `data/catalog.json` before Next compiles (`prebuild` runs `npm run validate`). `output: 'export'` in `next.config.ts` writes a static site. `npm start` is a static preview, not `next start` (that command cannot serve an export). `tsx` is a production dependency so the catalog check still runs when devDependencies are omitted.

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
| `exampleBrands` | Brand names on the landing card. Any length, including an empty list. Each entry must be a non-empty string after trimming. An entry that is exactly `TODO` in any case, ignoring surrounding spaces, is hidden and is not printed. If none remain, the card shows a muted "Brands coming" line. A name that merely contains those letters, such as "Todoist", is shown. |
| `status` | `live` or `coming_soon` only. Live tiers are links to `/{id}`. Coming-soon tiers are not links. On the landing card they are muted and say "Coming soon". In the switcher they are disabled and not clickable. The switcher does not show the word "Soon"; coming soon is conveyed accessibly. The URL still exists and shows a coming-soon page inside the same top bar. Picks for a coming-soon tier are not listed, and `?pick=` does not open a drawer there. |
| `accent` | Hex color `#` plus six digits, such as `#10B981`. Used on the live landing card, the selected switcher segment, the kit strip, and Buy buttons. Buy buttons use a darkened accent so white text clears 4.5:1. The accent appears as a restrained mark on the kit strip, not a full-bleed color wash. |

### `sections`

Ordered list of group names, for example `"Wear"`. Each name is required after trimming and must be unique. This order is the order of groups on the tier page. A section with no categories is skipped. The tier page is one grid. A section label is drawn on the first card of that section and again on the first card of a row where the section continues, at each breakpoint. Adding a section is still only a JSON edit.

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
| `brand` | Short brand name. Required and non-empty after trimming. If it is exactly `TODO` in any case, ignoring surrounding spaces, the product is not ready (see below). |
| `name` | Product name. Required and non-empty after trimming. |
| `price` | A finite number greater than or equal to 0, not a string. `28` or `28.5`. Do not include a currency symbol. Whole numbers format with no cents (`$28`). Any other number uses two decimal places (`$28.50`). Formatting is `Intl.NumberFormat` with locale `en-US` and the pick's currency. `0` is a real price (`$0`), not "unset". |
| `currency` | Three uppercase letters that `Intl.NumberFormat` accepts as a currency, such as `USD`. A lowercase code fails validation. Real mains in one tier must share a single currency. |
| `url` | Retailer link. Must be an absolute `http:` or `https:` URL. `https://TODO` is allowed: its hostname is `todo`, which is the placeholder and is not a Buy link. A normal URL whose path contains the letters "todo" is valid and is a Buy link. `javascript:` fails the build. |
| `image` | Must start with `/images/`, contain only letters, numbers, `.`, `_`, `/`, and `-`, and must not contain `..`. Whitespace is not trimmed. The file must exist at `public` plus that path, or the build fails with `File not found at public/images/...`. A path that resolves outside `public/` is rejected. Example: `/images/tee.jpg` is the file `public/images/tee.jpg`. |
| `why` | One line. Required, at most 90 characters after trimming. The card shows at most two lines. |
| `alt.when` | Required on the alternative, at most 90 characters after trimming. A short note for when you would pick it instead, such as "If you want it cheaper". It does not fall back to another label because it was omitted. If the alternative is shown and this text is an unfinished TODO note, the UI may hide that note. Validation rejects those notes once `alt.brand` is a real brand, so a shown alternative has a real `when`. |

### How TODO works

Seed picks use a placeholder so real products are never invented. Do not replace `TODO` with made-up products.

A brand is a placeholder when it trims to exactly `TODO` in any capitalization. Validation already requires a non-empty brand, so the value you will type is `TODO`.

- A TODO main (brand trims to exact `TODO`, any case) renders as an empty card that says "Pick coming" and does not show a broken image or the word TODO. A category with no pick does the same. On a live tier, `?pick={category id}` opens that category. The drawer says the pick is still being chosen. There is no Buy button and no fake product.
- `alt.brand` of `TODO` hides the alternative column. The drawer shows only the main pick.
- Unfinished copy is the exact word `TODO`, or a note that starts with `TODO:` (any case, after trimming). `Todo Wool Tee` is not unfinished. Strings that merely contain "todo" are shown. Only that exact word or a `TODO:` note is hidden. If an alternative is shown with an unfinished `when`, the UI may hide the note, but validation already rejects that once `alt.brand` is a real brand.
- If `brand` is a real brand and `name`, `why`, or `alt.when` is still unfinished, the build fails: `picks[3].main.name: is still TODO but brand is set`. A fully placeholder product (brand `TODO`, with TODO notes in the other fields) is valid. That is the seed.
- The kit line counts every category, not a hardcoded 10: `1 thing`, otherwise `things`. The total adds `main.price` only for that tier's picks whose main brand is not a placeholder. `$0` is a real price and is included.
  - Nothing priced yet: `Your Mid kit: 10 things, prices coming`.
  - Every category has a priced (non-TODO-brand) main, one currency: `Your Mid kit: 10 things, about $X total`.
  - Some but not all: `Your Mid kit: 10 things, about $X for the 3 picked so far`.
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

Put the file in `public/images/` and set `image` to a path such as `/images/your-file.jpg` (see the path rules above). The file must exist at `public` plus that path, or the build fails with `File not found`. A neutral placeholder is already at `public/images/placeholder.svg` and passes. A missing file does not fall back during the build. If a file disappears after the build, the page falls back to `/images/placeholder.svg` instead of a broken image.

Use a wide product photo on a light background, about 960 pixels wide. Images are 4:3 and contained, not cropped or stretched. The first two cards load eagerly. The rest load lazily.

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

Checked failures include missing or whitespace-only required fields (they fail after trim with `Required`), wrong types, a price that is not a finite number greater than or equal to 0, a currency that is not three uppercase letters accepted by `Intl.NumberFormat`, an image path that does not start with `/images/` or that contains `..`, a missing image file (`File not found`), an image path that resolves outside `public/`, `why` or `alt.when` longer than 90 characters after trim, an accent that is not `#` plus six hex digits, a status other than `live` or `coming_soon`, a slug that is not lowercase (whitespace is not trimmed into a valid slug), a URL that is not `http:` or `https:` (`javascript:` fails; `https://TODO` is allowed; a path that merely contains "todo" is still valid), a real brand whose name, why, or `alt.when` is still `TODO` or a `TODO:` note, more than one currency among a tier's real mains, duplicate tier ids, duplicate section names, duplicate category ids, duplicate picks for the same tier and category, a category whose section does not exist, and a pick whose tier or category does not exist.

## Deploy on Vercel

The project is a static export (`output: 'export'` in `next.config.ts`) and needs no server, database, or environment variables.

- Import the repo at [vercel.com/new](https://vercel.com/new). Framework preset: Next.js. Leave the build command as `npm run build`. Do not set an output directory. Vercel serves the export with zero extra config.
- Or from the repo root: `npx vercel`.

No analytics snippet, no extra config.

## Lighthouse

Target 90 or higher for performance and accessibility on mobile. The page is static. The tier shell is server-rendered. Product copy stays short, tap targets are at least 44px, and the accent stays on the live card edge, the switcher, the kit strip, and Buy buttons rather than on body text.
