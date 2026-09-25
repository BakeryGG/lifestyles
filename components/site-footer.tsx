import Link from "next/link";
import { loadCatalog } from "@/lib/catalog";
import { COPYRIGHT_YEAR, SITE_NAME, footerLinks, type FooterLink } from "@/lib/site";

function FooterAnchor({ link }: { link: FooterLink }) {
  const className =
    "inline-flex min-h-8 items-center text-[13px] leading-5 text-ink hover:text-muted focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-signal";
  if (/^https?:\/\//.test(link.href)) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

/** Site footer on every page. Columns come from `footerLinks` in lib/site.ts. */
export function SiteFooter() {
  const lifestyles = loadCatalog().tiers.map((tier) => ({ label: tier.name, href: `/${tier.id}` }));
  const columns = footerLinks
    .map((column) => ({ title: column.title, links: column.links === "lifestyles" ? lifestyles : column.links }))
    .filter((column) => column.links.length > 0);
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-x-6 gap-y-10 px-4 pt-12 pb-10 sm:grid-cols-4 sm:px-8 lg:grid-cols-6">
        <div className="col-span-2 flex flex-col gap-2">
          <p className="text-[15px] leading-5 tracking-[-0.02em] text-ink">{SITE_NAME}</p>
          <p className="max-w-[28ch] text-[13px] leading-5 text-muted">One pick for everything, at your level.</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={`Footer: ${column.title}`} className="flex flex-col gap-2">
            <p className="text-[12px] leading-4 tracking-[0.01em] text-muted">{column.title}</p>
            <ul className="flex flex-col">
              {column.links.map((link) => (
                <li key={link.href}>
                  <FooterAnchor link={link} />
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto max-w-[1440px] px-4 pb-8 sm:px-8">
        <p className="text-[12px] leading-4 text-muted">
          © {COPYRIGHT_YEAR} {SITE_NAME}
        </p>
      </div>
    </footer>
  );
}
