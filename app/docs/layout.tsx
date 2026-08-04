import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_NAME } from "@/lib/site";

/**
 * `app/docs/page.tsx` is a client component (it reads the store so the docs
 * can't drift from the product), and a client component can't export metadata.
 * This layout exists solely to give the route real metadata — it adds no
 * markup.
 */
// No brand name here — the root layout's title template appends "— Arkitype",
// and "How Arkitype works … — Arkitype" is how you get a doubled title in SERPs.
const TITLE = "How it works — the full walkthrough";
const DESCRIPTION =
  "Every step of the Arkitype builder explained: colour ramps and semantic roles, type and spacing scales, the component studio, the Figma bundle, and the framework exports.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/docs" },
  openGraph: {
    type: "article",
    url: "/docs",
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
