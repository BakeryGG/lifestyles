import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { withBasePath } from "@/lib/base-path";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  weight: "variable",
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: "variable",
  variable: "--font-geist-mono",
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
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-paper font-sans text-[14px] leading-5 tracking-[0.01em] text-ink">
        <a
          href="#content"
          data-skip-link=""
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-40 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-full focus:bg-ink focus:px-4 focus:text-[13px] focus:text-white focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-signal"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
