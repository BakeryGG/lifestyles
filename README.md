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
npx serve out
```

`npm run build` checks `data/catalog.json` before Next compiles (`prebuild` runs `npm run validate`). `output: 'export'` in `next.config.ts` writes a static site, so preview the `out/` folder rather than `next start`.

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
| `id` | URL slug. Lowercase letters and numbers, with single hyphens between parts. No leading, trailing, or doubled hyphen. The page is `/{id}`. Must be unique. |
| `name` | Label on the landing card and the tier switcher. |
| `description` | One line under the name. |
| `exampleBrands` | Brand names on the landing card. Any length, including an empty list. Each entry must be a non-empty string. An entry that is `TODO` in any case, ignoring surrounding spaces, is hidden and is not printed. If none remain, the card shows a muted "Brands coming" line. |
| `status` | `live` or `coming_soon` only. Live tiers are links to `/{id}`. Coming-soon tiers are muted, say "Coming soon" on the landing card and "Soon" in the tier switcher, and are not links or buttons. The URL still exists and shows a coming-soon page inside the same top bar. Picks for a coming-soon tier are not listed on that page. |
| `accent` | Hex color `#` plus six digits, such as `#10B981`. Used for the live landing card's thin top edge, the active switcher, the kit strip, and Buy buttons. Buy-button and active-switcher text stays white. A light accent is darkened until that white text reaches a contrast of 4.5:1. The kit strip uses a light wash of the original accent. |

### `sections`

Ordered list of group names, for example `"Wear"`. Each name is required and must be unique. This order is the order of groups on the tier page. A section with no categories is skipped.

### `categories`

| Field | Meaning |
| --- | --- |
| `id` | Unique slug, same rules as a tier id. Used in the share URL as `?pick={id}`. |
| `name` | Small label at the top of the card, such as "Everyday tee". |
| `section` | Must match a name in `sections` exactly, including case. |

### `picks`

One object per product recommendation. `tier` and `category` must refer to ids that exist. Only one pick per tier and category pair.

`main` is the product on the card. `alt` is the alternative in the drawer. Both are required on every pick.

| Field | Meaning |
| --- | --- |
| `brand` | Short brand name. Required and non-empty. If it is `TODO` in any case, ignoring surrounding spaces, the product is not ready (see below). |
| `name` | Product name. Required and non-empty. |
| `price` | A finite number greater than or equal to 0, not a string. `28` or `28.5`. Do not include a currency symbol. Whole numbers format with no cents (`$28`). Any other number uses two decimal places (`$28.50`). Formatting is `Intl.NumberFormat` with locale `en-US` and the pick's currency. |
| `currency` | Three uppercase letters that `Intl.NumberFormat` accepts as a currency, such as `USD`. A lowercase code fails validation. |
| `url` | Retailer link. Any non-empty string passes validation. Buy opens a new tab only when the value is an absolute `http:` or `https:` URL and does not contain the letters `todo` in any case. Otherwise the drawer shows "Link coming" and there is no link. `https://TODO` is not linked. |
| `image` | Must start with `/images/`, contain only letters, numbers, `.`, `_`, `/`, and `-`, and must not contain `..`. Example: `/images/tee.jpg`. The file lives in `public/images/`. |
| `why` | One line. Required, at most 90 characters. The card clamps it to two lines. |
| `alt.when` | Only on the alternative. Required, at most 90 characters. A short note for when you would pick it instead, such as "If you want it cheaper". |

### How TODO works

Seed picks use a placeholder so real products are never invented. Do not replace `TODO` with made-up products.

A brand is a placeholder when it is missing, blank, or the word `TODO` in any capitalization, with surrounding spaces ignored. Validation already requires a non-empty brand, so the value you will type is `TODO`.

- `main.brand` of `TODO` renders the category as an empty card: the category name and "Pick coming". It is not a button, and it does not open the drawer.
- A category with no pick object for that tier does the same.
- `alt.brand` of `TODO` hides the alternative. The drawer shows only the main pick.
- Text that is shown for brand, name, `why`, and `alt.when` is omitted when it is blank, exactly `TODO`, or starts with `TODO:` or `TODO ` (any case, after trimming). Those strings are not printed. If `alt.when` is omitted, the drawer label falls back to "Alternative".
- The kit line counts every category: `1 thing`, otherwise `things`. The total adds `main.price` only for that tier's picks whose main brand is not a placeholder. With nothing priced yet, or when those priced picks do not all use the same currency, it reads "Your Mid kit: 10 things, prices coming". With priced picks in one currency it reads "Your Mid kit: 10 things, about $128 total" (the tier name, the category count, and the formatted sum).

### Add a section

1. Append a unique, non-empty name to `sections`. Place it where it should appear on the tier page.
2. Point categories at that name with an exact `section` match.

No component changes. A section that no category uses is left off the page.

### Add a category

1. Add a name to `sections` if it needs a new group.
2. Append a category object with a new `id`, `name`, and `section`.
3. Optionally append a pick for each tier that should show a product. A live tier with no pick shows "Pick coming".

No component changes. The grid, the count in the kit line, and the `?pick=` links follow the file.

### Add a tier

1. Append a tier object with a unique `id`, `name`, `description`, `exampleBrands`, `status`, and `accent`.
2. Add `picks` whose `tier` is that id, one per category you want filled in.

Set `status` to `live` when the landing card should link to `/{id}` and the tier page should show the kit. `coming_soon` keeps the card muted and the tier page as a coming-soon state. Rebuild so the new `/{id}` page is exported.

### Add an image

Put the file in `public/images/` and set `image` to a path such as `/images/your-file.jpg` (see the path rules above). A neutral placeholder is already at `public/images/placeholder.svg`. If a file is missing, the card falls back to that placeholder instead of a broken image.

Use a wide product photo on a light background. Images are contained, not cropped or stretched.

## Validation

`npm run validate` (and `npm run build`, via `prebuild`) parses the file with zod. A bad file stops the build. Each problem is one line: the JSON path, then the message.

```text
catalog.json is invalid:
  - picks[0].main.price: Expected number, received string
  - categories[3].section: Unknown section "Garden"
  - picks[2].tier: Unknown tier "luxury"
  - tiers[1].id: Duplicate tier id "mid" (also at tiers[0].id)
  - sections[1]: Duplicate section "Wear" (also at sections[0])
  - picks[1]: Duplicate pick for tier "mid" and category "tee" (also at picks[0])
```

If the file cannot be read or is not JSON, the path is `(root)` and the message is the parser error:

```text
catalog.json is invalid:
  - (root): Expected property name or '}' in JSON at position 1
```

Checked failures include missing or empty required fields, wrong types, a price that is not a finite number greater than or equal to 0, a currency that is not three uppercase letters accepted by `Intl.NumberFormat`, an image path that does not start with `/images/` or that contains `..`, `why` or `alt.when` longer than 90 characters, an accent that is not `#` plus six hex digits, a status other than `live` or `coming_soon`, a slug that is not lowercase, duplicate tier ids, duplicate section names, duplicate category ids, duplicate picks for the same tier and category, a category whose section does not exist, and a pick whose tier or category does not exist.

## Deploy on Vercel

The project is a static export (`output: 'export'` in `next.config.ts`) and needs no server, database, or environment variables.

- Import the repo at [vercel.com/new](https://vercel.com/new). Framework preset: Next.js. Leave the build command as `npm run build`. Do not set an output directory. Vercel serves the export with zero extra config.
- Or from the repo root: `npx vercel`.

No analytics snippet, no extra config.

## Lighthouse

Target 90 or higher for performance and accessibility on mobile. The page is static, image-led, and free of third-party scripts. Keep product copy short, keep tap targets at least 44px, and keep the accent on the live card edge, the switcher, the kit strip, and Buy buttons rather than on body text.
