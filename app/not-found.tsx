import Link from "next/link";

export default function NotFound() {
  return (
    <main id="content" className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">This page is not in the catalog.</h1>
      <p className="mt-3 text-muted">That address does not match a tier.</p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      >
        Back to Lifestyles
      </Link>
    </main>
  );
}
