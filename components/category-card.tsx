"use client";

import type { ReactNode } from "react";
import { displayText, formatPrice, type TierCategoryView } from "@/lib/present";
import { ProductImage } from "./product-image";

const shell =
  "flex h-full min-w-0 w-full flex-col rounded-xl border border-line bg-card text-left";

function Label({ section, name }: { section: string; name: string }) {
  return (
    <div className="px-2.5 pt-2.5">
      <p aria-hidden="true" className="h-4 truncate text-[10px] font-medium uppercase leading-4 tracking-[0.14em] text-muted">
        {section}
      </p>
      <p className="h-4 truncate text-[12px] font-medium leading-4 tracking-tight text-ink">{name}</p>
    </div>
  );
}

function Media({ children }: { children?: ReactNode }) {
  return <div className="card-media mx-2.5 mt-2 overflow-hidden rounded-md bg-well">{children}</div>;
}

function Copy({ children }: { children: ReactNode }) {
  return <div className="flex h-[7.25rem] flex-col px-2.5 pb-2.5 pt-2">{children}</div>;
}

export function CategoryCard({
  category,
  section,
  onOpen,
}: {
  category: TierCategoryView;
  section: string;
  onOpen: (id: string, trigger: HTMLButtonElement) => void;
}) {
  if (!category.pick) {
    return (
      <article className={shell}>
        <Label section={section} name={category.name} />
        <Media />
        <Copy>
          <p className="m-auto text-[13px] leading-5 text-muted">Pick coming</p>
        </Copy>
      </article>
    );
  }

  const product = category.pick.main;
  const brand = displayText(product.brand);
  const name = displayText(product.name);
  const why = displayText(product.why);
  const alt = [brand, name].filter(Boolean).join(" ") || category.name;

  return (
    <button
      type="button"
      id={`card-${category.id}`}
      className={`${shell} cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink`}
      aria-haspopup="dialog"
      onClick={(event) => onOpen(category.id, event.currentTarget)}
    >
      <Label section={section} name={category.name} />
      <Media>
        <ProductImage src={product.image} alt={alt} />
      </Media>
      <Copy>
        <p className="truncate text-[10px] font-medium uppercase leading-4 tracking-[0.16em] text-muted">
          {brand ?? "\u00a0"}
        </p>
        <p className="mt-0.5 line-clamp-2 h-9 text-[14px] font-medium leading-[1.25] text-ink">
          {name ?? "\u00a0"}
        </p>
        <p className="mt-1 text-[13px] leading-5 tabular-nums text-ink">
          {formatPrice(product.price, product.currency)}
        </p>
        <p className="mt-0.5 line-clamp-2 h-8 text-[12px] leading-4 text-muted">{why ?? ""}</p>
      </Copy>
    </button>
  );
}
