import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Page not found · Lifestyles" },
};

export default function NotFound() {
  return (
    <main
      id="content"
      tabIndex={-1}
      className="content-focus mx-auto flex min-h-full max-w-lg scroll-mt-16 flex-col px-6 pt-24 pb-16"
    >
      <h1 className="text-[2rem] leading-[1.1] font-normal tracking-[-0.02em]">This page is not in the catalog.</h1>
      <p className="mt-4 text-[15px] leading-6 text-muted">That address does not match a lifestyle.</p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center text-[14px] text-ink underline decoration-line underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
      >
        Back to Lifestyles
      </Link>
    </main>
  );
}
