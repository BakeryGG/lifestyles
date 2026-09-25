export function ProductImage({
  src,
  srcSet,
  priority = "lazy",
  sizes,
  className,
}: {
  src: string;
  srcSet?: string;
  /** `high` is the single LCP candidate. `eager` loads now without high priority. */
  priority?: "high" | "eager" | "lazy";
  sizes: string;
  className?: string;
}) {
  const eager = priority === "high" || priority === "eager";
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export has no image optimizer
    <img
      src={src}
      srcSet={srcSet}
      alt=""
      width={1200}
      height={900}
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={priority === "high" ? "high" : "auto"}
      decoding="async"
      data-fallback="/images/placeholder.svg"
      className={className}
    />
  );
}
