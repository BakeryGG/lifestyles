/**
 * Footer columns. Add a page by adding a link here (and the route under app/).
 * `links: "lifestyles"` fills the column from data/catalog.json. Empty columns are hidden.
 */
export type FooterLink = { label: string; href: string };
export type FooterColumn = { title: string; links: FooterLink[] | "lifestyles" };

export const footerLinks: FooterColumn[] = [
  { title: "Lifestyles", links: "lifestyles" },
  {
    title: "Site",
    links: [
      { label: "Home", href: "/" },
      // { label: "About", href: "/about" },
      // { label: "How we pick", href: "/how-we-pick" },
    ],
  },
  {
    title: "Contact",
    links: [
      // { label: "Contact", href: "/contact" },
      // { label: "Instagram", href: "https://instagram.com/..." },
    ],
  },
];

export const SITE_NAME = "Lifestyles";
export const COPYRIGHT_YEAR = 2026;
