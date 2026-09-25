export function ProductImage({
  src,
  priority = false,
  sizes,
  className,
}: {
  src: string;
  priority?: boolean;
  sizes: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- export has no image optimizer
    <img
      src={src}
      alt=""
      width={800}
      height={600}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding={priority ? "sync" : "async"}
      data-fallback="/images/placeholder.svg"
      className={className}
    />
  );
}
