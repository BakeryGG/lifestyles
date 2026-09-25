"use client";

import { CategoryCard } from "./category-card";
import type { PresentedPick } from "@/lib/present";
import { sectionHeadingId } from "@/lib/section-id";

export type GridCard = {
  id: string;
  name: string;
  tags: string[];
  /** Card needs only the main pick; the drawer gets alternatives separately. */
  pick: Pick<PresentedPick, "main"> | null;
};

export type GridGroup = { id: string; section: string; sectionIndex: number; cards: GridCard[] };

/**
 * The product grid. A client component so the page's flight data carries these compact
 * props once instead of a second copy of the rendered markup. Still prerendered to HTML.
 */
export function KitGrid({ groups, eagerIds }: { groups: GridGroup[]; eagerIds: string[] }) {
  const priorityFor = (id: string): "high" | "eager" | "lazy" => {
    const index = eagerIds.indexOf(id);
    return index === 0 ? "high" : index > 0 ? "eager" : "lazy";
  };
  return (
    <div className="kit-grid">
      {groups.map((group) => {
        const headingId = sectionHeadingId(group.sectionIndex);
        return (
          <section key={group.id} className="kit-section" aria-labelledby={headingId}>
            <h2 id={headingId} className="kit-heading text-[13px] leading-5 tracking-[0.01em] text-muted">
              {group.section}
            </h2>
            {group.cards.map((card) => (
              <div key={card.id} className="kit-card min-w-0" data-tags={card.tags.join(" ")} data-empty={card.pick ? undefined : ""}>
                <CategoryCard id={card.id} name={card.name} section={group.section} pick={card.pick} priority={priorityFor(card.id)} />
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
