"use client";

import Image from "next/image";
import { useState } from "react";

const FALLBACK = "/images/placeholder.svg";

export function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [current, setCurrent] = useState(src || FALLBACK);

  return (
    <Image
      src={current || FALLBACK}
      alt={alt}
      width={800}
      height={600}
      unoptimized
      className="h-full w-full object-contain"
      onError={() => {
        setCurrent((previous) => (previous === FALLBACK ? previous : FALLBACK));
      }}
    />
  );
}
