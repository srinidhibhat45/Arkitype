import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Instrument_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import {
  SITE_DESCRIPTION,
  SITE_DESCRIPTION_LONG,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    // Published styleguides and /docs set their own title; this keeps the brand
    // on the end of it without every page restating it.
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Srinidhi Bhat" }],
  creator: "Srinidhi Bhat",
  keywords: [
    "design system builder",
    "design tokens",
    "Figma variables",
    "design system generator",
    "semantic color tokens",
    "WCAG contrast",
    "Tailwind config generator",
    "MUI theme generator",
    "component library",
    "styleguide hosting",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION_LONG,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "technology",
};

/**
 * Structured data. `SoftwareApplication` is the honest type here — Arkitype is
 * a tool you use, not an article or a product listing — and it's what earns the
 * richer result for "design system builder" style queries.
 */
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION_LONG,
  applicationCategory: "DesignApplication",
  operatingSystem: "Any (web-based)",
  browserRequirements: "Requires JavaScript and a modern browser",
  featureList: [
    "Colour ramp and semantic role generation",
    "WCAG AA contrast auditing",
    "Type, spacing, radius, and motion scales",
    "53 token-bound components",
    "Figma Variables bundle with in-place re-sync",
    "Tailwind, MUI, and CSS custom-property exports",
    "Hosted public styleguide",
  ],
  author: { "@type": "Person", name: "Srinidhi Bhat" },
};

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable} ${display.variable}`}>
      <body className="bg-ink font-sans text-fg antialiased">
        <script
          type="application/ld+json"
          // Serialized structured data — not user input, and never rendered as
          // markup by the browser (script type is ld+json).
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {children}
      </body>
      {GA_MEASUREMENT_ID && <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />}
    </html>
  );
}
