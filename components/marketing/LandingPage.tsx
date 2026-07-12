"use client";

import { useDesignSystem, STEP_META, STEP_ORDER } from "@/store/useDesignSystem";
import { ArrowRight, Moon, Sun } from "lucide-react";

/**
 * Landing page — deliberately quiet. Arkitype's own chrome is monochrome by
 * design (the only colour on screen is the system the user is building), so the
 * marketing surface follows the same rule: theme-aware ink/fg/line tokens, a
 * serif editorial voice, and real information a designer needs before signing
 * in. No mock product screenshots, no gimmicks — just what the tool does.
 */

// The real guided journey (STEP_ORDER), pulled from the store so it can never
// drift from the actual builder. "roles" is merged into Colour, not a stop.
const EXPORTS = ["CSS variables", "Tailwind config", "JSON tokens", "Figma variables"];

const HIGHLIGHTS = [
  {
    title: "Tokens that cascade",
    body: "Change one primitive and every semantic role, interaction state, and component that references it updates in place.",
  },
  {
    title: "Accessibility, checked live",
    body: "A contrast engine watches every pairing against WCAG as you work, in both light and dark themes.",
  },
  {
    title: "Fifty components, all re-bindable",
    body: "Each component reads from your tokens with full modifier parity — variants, sizes, and states included.",
  },
];

export function LandingPage() {
  const setView = useDesignSystem((s) => s.setView);
  const user = useDesignSystem((s) => s.user);
  const chromeTheme = useDesignSystem((s) => s.chromeTheme);
  const toggleChromeTheme = useDesignSystem((s) => s.toggleChromeTheme);

  const start = () => setView(user ? "dashboard" : "login");
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen bg-ink text-fg font-sans antialiased selection:bg-fg/10">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="font-serif text-2xl leading-none tracking-tight text-fg"
          >
            Arkitype
          </button>

          <div className="flex items-center gap-1 sm:gap-3">
            <button
              onClick={toggleChromeTheme}
              aria-label="Toggle light or dark theme"
              className="rounded-full p-2.5 text-fg-mute transition-colors hover:bg-ink-hover hover:text-fg"
            >
              {chromeTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              onClick={() => setView("login")}
              className="hidden rounded-lg px-4 py-2.5 text-[15px] font-medium text-fg-dim transition-colors hover:text-fg sm:block"
            >
              Sign in
            </button>
            <button
              onClick={start}
              className="rounded-lg bg-fg px-5 py-2.5 text-[15px] font-medium text-ink transition-opacity hover:opacity-90"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-20 sm:pt-32 sm:pb-28">
        <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-fg-mute">
          Open source · Design-system builder · Beta
        </p>
        <h1 className="max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight text-fg sm:text-6xl lg:text-7xl">
          Build the system
          <br />
          before the screens.
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-fg-dim">
          A guided builder that turns a single brand colour into a complete,
          accessible design system — tokens, fifty components, and a Figma
          bundle — across eight ordered steps.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            onClick={start}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-fg px-7 py-3.5 text-base font-medium text-ink transition-opacity hover:opacity-90"
          >
            Get started
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => scrollTo("journey")}
            className="inline-flex items-center justify-center rounded-lg border border-line-strong px-7 py-3.5 text-base font-medium text-fg transition-colors hover:bg-ink-hover"
          >
            See how it works
          </button>
        </div>

        <p className="mt-8 text-sm text-fg-mute">
          Built on React and Tailwind. Free while in beta.
        </p>
      </section>

      {/* ── The journey (real, useful, necessary info) ─────────── */}
      <section id="journey" className="border-t border-line/60">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
          <h2 className="font-serif text-3xl tracking-tight text-fg sm:text-4xl">
            Eight steps, in order
          </h2>
          <p className="mt-3 max-w-xl text-base text-fg-dim">
            Each step builds on the last, so decisions compound instead of
            conflict. You always know what comes next.
          </p>

          <ol className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
            {STEP_ORDER.map((id) => {
              const step = STEP_META[id];
              return (
                <li key={id} className="flex gap-5 bg-ink p-6">
                  <span className="font-serif text-2xl leading-none text-fg-mute">
                    {step.n}
                  </span>
                  <div>
                    <h3 className="text-lg font-medium text-fg">{step.label}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-fg-mute">
                      {step.blurb}.
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── What you get ───────────────────────────────────────── */}
      <section className="border-t border-line/60">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
          <div className="grid grid-cols-1 gap-x-12 gap-y-12 sm:grid-cols-3">
            {HIGHLIGHTS.map((h) => (
              <div key={h.title}>
                <h3 className="font-serif text-xl tracking-tight text-fg">
                  {h.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-fg-dim">
                  {h.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-16 flex flex-col gap-6 border-t border-line/60 pt-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-serif text-xl tracking-tight text-fg">
                Export to where you already work
              </h3>
              <p className="mt-2 text-sm text-fg-dim">
                One system, generated for every target — plus a CLI and MCP
                server so an agent can scaffold and sync it for you.
              </p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {EXPORTS.map((e) => (
                <li
                  key={e}
                  className="rounded-full border border-line-strong px-4 py-1.5 text-sm text-fg-dim"
                >
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Closing CTA ────────────────────────────────────────── */}
      <section className="border-t border-line/60">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center sm:py-32">
          <h2 className="mx-auto max-w-2xl font-serif text-4xl leading-[1.1] tracking-tight text-fg sm:text-5xl">
            Start with one colour.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base text-fg-dim">
            Name a system, pick a hue, and let every step follow from there.
          </p>
          <button
            onClick={start}
            className="mt-9 inline-flex items-center justify-center gap-2 rounded-lg bg-fg px-8 py-4 text-base font-medium text-ink transition-opacity hover:opacity-90"
          >
            Get started
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-line/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-fg-mute sm:flex-row">
          <span className="font-serif text-lg tracking-tight text-fg">Arkitype</span>
          <span>© {new Date().getFullYear()} Arkitype · Open source, in beta</span>
          <button
            onClick={() => setView("login")}
            className="transition-colors hover:text-fg"
          >
            Sign in
          </button>
        </div>
      </footer>
    </div>
  );
}
