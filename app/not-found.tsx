import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Page not found · Lifestyles" },
};

export default function NotFound() {
  return (
    <main id="content" tabIndex={-1} className="mx-auto flex min-h-full max-w-lg scroll-mt-14 flex-col px-6 pt-24 pb-16 outline-none">
      <h1 className="text-3xl font-semibold tracking-tight">This page is not in the catalog.</h1>
      <p className="mt-3 text-muted">That address does not match a tier.</p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-ink underline decoration-current underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      >
        Back to Lifestyles
      </Link>
    </main>
  );
}
