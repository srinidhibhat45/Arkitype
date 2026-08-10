"use client";

/**
 * /docs — the full walkthrough, on its own public route so it can go into real
 * depth without bloating the marketing scroll: a sticky sidebar, one section
 * per build step, and reference material.
 *
 * The words themselves live in `components/docs/DocsContent` — this page is
 * their marketing-site frame, and the Docs tab inside a file is the other one.
 * Content mirrors the actual builder (STEP_ORDER/STEP_META, FRAMEWORK_TWINS,
 * PROJECT_LIMIT, COMPONENT_LANES) so it can't quietly drift from the product.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useDesignSystem } from "@/store/useDesignSystem";
import { DocsSections } from "@/components/docs/DocsContent";
import { DOCS_NAV } from "@/components/docs/docsNav";
import { BetaTag } from "@/components/ui/BetaTag";
import { ArrowLeft, Moon, Sun } from "lucide-react";

/* ── page ─────────────────────────────────────────────────────── */

export default function DocsPage() {
  const chromeTheme = useDesignSystem((s) => s.chromeTheme);
  const toggleChromeTheme = useDesignSystem((s) => s.toggleChromeTheme);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // /docs is a separate route from app/page.tsx, which is where the SPA
  // normally applies chromeTheme to <html> — replicate that here so the
  // toggle in this page's own header actually does something.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", chromeTheme === "dark");
  }, [chromeTheme]);
  if (!mounted) return <div className="min-h-screen bg-ink" />;

  return (
    <div className="min-h-screen bg-ink text-fg font-sans antialiased">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 font-serif text-2xl leading-none tracking-tight text-fg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={28} height={28} className="rounded-md" />
            Arkitype
            <BetaTag />
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              className="rounded-lg border border-line-strong px-3 py-2 text-sm font-medium text-fg-dim lg:hidden"
            >
              Contents
            </button>
            <button
              onClick={toggleChromeTheme}
              aria-label="Toggle light or dark theme"
              className="rounded-full p-2.5 text-fg-mute transition-colors hover:bg-ink-hover hover:text-fg"
            >
              {chromeTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg px-4 py-2.5 text-[15px] font-medium text-fg-dim transition-colors hover:text-fg sm:flex"
            >
              <ArrowLeft size={15} /> Back to site
            </Link>
            <Link
              href="/"
              className="rounded-lg bg-fg px-5 py-2.5 text-[15px] font-medium text-ink transition-opacity hover:opacity-90"
            >
              Open Arkitype
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-12 px-6">
        {/* ── Sidebar ────────────────────────────────────────────── */}
        <aside
          className={`${
            mobileNavOpen ? "block" : "hidden"
          } fixed inset-x-0 top-[65px] z-30 max-h-[calc(100vh-65px)] overflow-y-auto bg-ink px-6 pb-10 pt-6 lg:sticky lg:top-24 lg:block lg:h-[calc(100vh-7rem)] lg:w-56 lg:shrink-0 lg:px-0 lg:pb-0`}
        >
          <nav className="space-y-7">
            {DOCS_NAV.map((group) => (
              <div key={group.heading}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-mute">
                  {group.heading}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={() => setMobileNavOpen(false)}
                        className="block rounded-md px-2 py-1.5 text-sm text-fg-dim transition-colors hover:bg-ink-hover hover:text-fg"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* ── Content ────────────────────────────────────────────── */}
        <main className="min-w-0 flex-1 py-14">
          <div className="mb-10">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-fg-mute">Documentation</p>
            <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-[1.1] tracking-tight text-fg sm:text-5xl">
              Everything Arkitype does, in order.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-dim">
              One page, start to finish: how a file is born, what each of the eight
              build steps actually lets you configure, and exactly what comes out
              the other end when you ship.
            </p>
          </div>

          <DocsSections />

          <div className="pt-14 text-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-fg px-7 py-3.5 text-base font-medium text-ink transition-opacity hover:opacity-90"
            >
              Start building
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
