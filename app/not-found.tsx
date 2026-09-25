import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Page not found · Lifestyles" },
};

export default function NotFound() {
  return (
    <main
      id="content"
      tabIndex={-1}
      className="mx-auto flex min-h-full max-w-lg scroll-mt-14 flex-col px-6 pt-24 pb-16 focus:outline focus:outline-2 focus:outline-offset-4 focus:outline-ink"
    >
      <h1 className="text-3xl font-semibold tracking-tight">This page is not in the catalog.</h1>
      <p className="mt-4 text-muted">That address does not match a tier.</p>
      {/* Plain anchor: a full load lets the cross-document view transition run. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-ink underline decoration-current underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      >
        Back to Lifestyles
      </a>
    </main>
  );
}
