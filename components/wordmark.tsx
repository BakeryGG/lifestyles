import Link from "next/link";

export function Wordmark() {
  return (
    <Link
      href="/"
      className="inline-flex h-11 shrink-0 items-center text-[13px] leading-none tracking-[-0.02em] text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal min-[400px]:text-[15px]"
    >
      Lifestyles
    </Link>
  );
}
