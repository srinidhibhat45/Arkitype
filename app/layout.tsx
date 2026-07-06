import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arkitype — Build the system before the screens",
  description:
    "A guided design-system builder: from one brand colour to a shipped Figma bundle, in seven ordered steps.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="h-screen overflow-hidden bg-ink font-sans text-fg antialiased">
        {children}
      </body>
    </html>
  );
}
