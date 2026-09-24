# Lifestyles v1: Build Spec

> Hand this whole file to the coding agent. It is the complete brief for v1.

## 1. What we're building

Lifestyles is a website where someone picks a lifestyle tier (how they live and spend) and immediately sees one recommended product for each thing they buy: clothes, shoes, bedding, laptop, laundry detergent, and so on.

The whole product is the **visual presentation of information**. Other options (Google, Reddit, Wirecutter, store sites) make you search one product at a time. Lifestyles shows your whole life's shopping list at a glance, already decided, in a layout you can scan in about ten seconds.

v1 is a **thin slice**: the full site structure for three tiers, but real content for **one tier and 10 categories**. Its job is to test one thing: do real people decide what to buy faster with this than with their usual method, and would they come back?

## 2. Success criteria for v1

v1 is done when:

1. A first-time visitor can land, pick a tier, and see every recommendation for that tier within two clicks.
2. The tier page shows all 10 categories on one screen on desktop, and in one smooth scroll on mobile, with no text walls.
3. Each category shows one main pick and one alternative, each with brand, product name, price, a one-line reason, and a buy link that opens the retailer in a new tab.
4. All content comes from one data file (`/data/catalog.json`), so the curator can change any pick without touching code.
5. It looks polished enough that the design itself is the selling point (see section 6). This matters more than any feature.
6. It works well on a phone, since that's where most people will open it.

## 3. Non-goals (do not build)

- Accounts, logins, saved lists, or user profiles
- Search, filters, sorting, ratings, star reviews, or user comments
- A CMS or admin panel (the JSON file is the CMS)
- Affiliate tracking, ads, analytics dashboards, or email capture
- Blog posts, SEO articles, or long-form reviews
- Content for more than one tier (the other two show a "coming soon" state)
- Price scraping or live price updates

## 4. Pages and flow

### 4.1 Landing page (`/`)

- A short headline and one supporting line. Working copy: **"Pick how you live. We'll tell you what to buy."** and "One pick for everything, at your level."
- Three tier cards side by side (stacked on mobile). Each card shows:
  - Tier name and a one-line description
  - Three example brands in that tier
  - A status: live tiers are clickable; coming-soon tiers are visibly muted with a "Coming soon" label and are not clickable
- Clicking a live tier goes to `/[tier]`.
- Nothing else on the page. No feature lists, no testimonials.

### 4.2 Tier page (`/[tier]`)

This is the product. Treat it as the most important screen.

- **Top bar:** site name on the left; a tier switcher (segmented control with the three tiers) on the right. Coming-soon tiers appear disabled in the switcher.
- **Kit summary strip:** "Your [tier] kit: 10 things, about $X total", where X is the sum of the main picks' prices, computed from the data.
- **Category grid**, grouped into sections (Wear, Home, Tech, Everyday). Each category is a card with:
  - Category label (small, top)
  - Product image (large, consistent aspect ratio, all cards the same size)
  - Brand (small caps or muted) and product name
  - Price
  - The one-line "why" (max ~90 characters, never wraps past two lines)
- If a category has no pick yet, show a tasteful empty card: category label plus "Pick coming". Never show broken images or empty fields.

### 4.3 Pick detail (drawer or modal, not a new page)

Opens when a category card is clicked.

- Main pick and alternative side by side (stacked on mobile), each with image, brand, name, price, the "why", and a **Buy** button that opens the retailer URL in a new tab.
- A short label on the alternative explaining when you'd choose it instead (field: `alt.when`), e.g. "If you want it cheaper" or "If you run hot at night".
- Closes with Esc, a close button, or a click outside. The URL updates to `/[tier]?pick=[category]` so a specific pick can be shared.

## 5. Data model

All content lives in `/data/catalog.json`. Validate it at build time (e.g. with zod) and fail the build with a clear message if a required field is missing.

```json
{
  "tiers": [
    {
      "id": "budget",
      "name": "Budget",
      "description": "Smart, cheap, and good enough.",
      "exampleBrands": ["H&M", "Old Navy", "Target"],
      "status": "coming_soon",
      "accent": "#3B82F6"
    },
    {
      "id": "mid",
      "name": "Mid",
      "description": "Pay a bit more where it matters.",
      "exampleBrands": ["TODO", "TODO", "TODO"],
      "status": "live",
      "accent": "#10B981"
    },
    {
      "id": "high",
      "name": "High",
      "description": "The best version of everything.",
      "exampleBrands": ["Eight Sleep", "Vuori", "Uniqlo"],
      "status": "coming_soon",
      "accent": "#111827"
    }
  ],
  "sections": ["Wear", "Home", "Tech", "Everyday"],
  "categories": [
    { "id": "tee",        "name": "Everyday tee",       "section": "Wear" },
    { "id": "pants",      "name": "Jeans / pants",      "section": "Wear" },
    { "id": "sneakers",   "name": "Everyday sneakers",  "section": "Wear" },
    { "id": "layer",      "name": "Hoodie / layer",     "section": "Wear" },
    { "id": "mattress",   "name": "Mattress / bed",     "section": "Home" },
    { "id": "detergent",  "name": "Laundry detergent",  "section": "Home" },
    { "id": "coffee",     "name": "Coffee setup",       "section": "Home" },
    { "id": "laptop",     "name": "Laptop",             "section": "Tech" },
    { "id": "headphones", "name": "Headphones",         "section": "Tech" },
    { "id": "bag",        "name": "Daily bag",          "section": "Everyday" }
  ],
  "picks": [
    {
      "tier": "mid",
      "category": "tee",
      "main": {
        "brand": "TODO",
        "name": "TODO",
        "price": 0,
        "currency": "USD",
        "url": "https://TODO",
        "image": "/images/placeholder.svg",
        "why": "TODO: one line, under 90 characters"
      },
      "alt": {
        "brand": "TODO",
        "name": "TODO",
        "price": 0,
        "currency": "USD",
        "url": "https://TODO",
        "image": "/images/placeholder.svg",
        "why": "TODO",
        "when": "TODO: e.g. If you want it cheaper"
      }
    }
  ]
}
```

Rules:

- Tier names, descriptions, example brands, categories, and sections are all editable data, not hard-coded.
- **Do not invent real products, prices, or links.** Seed every pick for the live tier with the `TODO` placeholder shape above so the curator fills them in. Picks whose `brand` is `TODO` render as the "Pick coming" empty card.
- Product images live in `/public/images/` and are referenced by path. Include a neutral placeholder SVG.
- Adding a new category or tier must require only a JSON edit.

## 6. Design direction

The design is the product, so hold a high bar here.

- **Scannable first.** Someone should grasp their whole kit in ten seconds. Every card has the same size, the same layout, and the same information in the same place.
- **Image-led.** Large product images on clean, light backgrounds. Text is secondary and short.
- **Calm and premium.** Generous whitespace, one clean sans-serif typeface (e.g. Inter), a restrained neutral palette, and the tier's accent color used sparingly (switcher, kit strip, buy buttons).
- **No clutter.** No stars, badges, "best seller" tags, pop-ups, or cookie-banner-style interruptions.
- **Motion is subtle.** A soft fade or slide when switching tiers or opening the drawer; nothing bouncy.
- **Mobile.** Two-column card grid on phones, four or five columns on desktop. Tap targets at least 44px. The drawer becomes a bottom sheet on mobile.
- Reference feel: Apple's product-comparison pages and a well-designed printed catalog, not a blog or a deals site.

## 7. Tech stack

- Next.js (App Router) with TypeScript
- Tailwind CSS
- Static generation for every page (no server, no database)
- zod for validating `catalog.json` at build time
- Deployable to Vercel with zero configuration
- Target a Lighthouse score of 90+ for performance and accessibility on mobile

## 8. Acceptance checklist

- [ ] `/` shows three tier cards; only live tiers are clickable
- [ ] `/mid` (or whichever tier is live) shows all 10 categories grouped by section
- [ ] Kit summary total is computed from the data and updates if a price changes
- [ ] Clicking a card opens the drawer with main pick and alternative; Buy opens a new tab
- [ ] `?pick=` deep link opens the right drawer on load
- [ ] Empty or `TODO` picks render as "Pick coming", with no broken images
- [ ] Tier switcher works; coming-soon tiers are disabled
- [ ] Build fails with a readable error if `catalog.json` is malformed
- [ ] Looks right at 375px, 768px, and 1440px widths
- [ ] Keyboard navigable; the drawer traps focus and closes with Esc
- [ ] README explains how to edit `catalog.json`, add images, run locally, and deploy

## 9. Deliverables

1. The repository with the site, the seeded `catalog.json`, and a placeholder image
2. A README covering local run, editing content, and deploying to Vercel
3. A deployed preview URL
