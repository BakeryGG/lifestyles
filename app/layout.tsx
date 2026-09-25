import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { withBasePath } from "@/lib/base-path";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Lifestyles",
    template: "%s · Lifestyles",
  },
  description: "Pick how you live. We'll tell you what to buy.",
  icons: { icon: withBasePath("/favicon.svg") },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f3f0",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper font-sans text-ink">
        <a
          href="#content"
          data-skip-link=""
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-40 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-full focus:bg-ink focus:px-4 focus:text-sm focus:font-medium focus:text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-white"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
