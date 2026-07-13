"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useDesignSystem, STEP_META, STEP_ORDER } from "@/store/useDesignSystem";
import { BetaTag } from "@/components/ui/BetaTag";
import {
  ArrowRight,
  Moon,
  Sun,
  Palette,
  Type as TypeIcon,
  Ruler,
  Shapes,
  Zap,
  LayoutGrid,
  Eye,
  Rocket,
  RefreshCw,
  ShieldCheck,
  Component,
  Figma,
  Braces,
  Wind,
  PaintBucket,
  FileText,
  type LucideIcon,
} from "lucide-react";

/** Fade-and-rise once the element scrolls into view. Quiet on purpose. */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let done = false;
    let io: IntersectionObserver | null = null;
    const show = () => {
      if (done) return;
      done = true;
      setShown(true);
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // Scroll fallback alongside IntersectionObserver — some embedded
    // webviews deliver IO callbacks unreliably, and content must never
    // stay invisible.
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight - 32 && r.bottom > 0) show();
    };

    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) show();
        },
        { threshold: 0.12, rootMargin: "0px 0px -32px 0px" }
      );
      io.observe(el);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();

    return () => {
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "reveal-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * Landing page — deliberately quiet. Arkitype's own chrome is monochrome by
 * design (the only colour on screen is the system the user is building), so the
 * marketing surface follows the same rule: theme-aware ink/fg/line tokens, a
 * serif editorial voice, and real information a designer needs before signing
 * in. No mock product screenshots, no gimmicks — just what the tool does.
 */

// The real guided journey (STEP_ORDER), pulled from the store so it can never
// drift from the actual builder. "roles" is merged into Colour, not a stop.
const STEP_ICONS: Record<string, LucideIcon> = {
  colour: Palette,
  type: TypeIcon,
  space: Ruler,
  shape: Shapes,
  motion: Zap,
  components: LayoutGrid,
  preview: Eye,
  ship: Rocket,
};

const EXPORTS: { label: string; icon: LucideIcon }[] = [
  { label: "Figma bundle", icon: Figma },
  { label: "CSS variables", icon: Braces },
  { label: "Tailwind config", icon: Wind },
  { label: "MUI theme", icon: PaintBucket },
  { label: "Markdown handoff doc", icon: FileText },
];

const HIGHLIGHTS = [
  {
    title: "Tokens that cascade",
    body: "Change one primitive and every semantic role, interaction state, and component that references it updates in place.",
    icon: RefreshCw,
  },
  {
    title: "Accessibility, checked live",
    body: "A contrast engine watches every pairing against WCAG as you work, in both light and dark themes.",
    icon: ShieldCheck,
  },
  {
    title: "Fifty components, all re-bindable",
    body: "Each component reads from your tokens with full modifier parity — variants, sizes, and states included.",
    icon: Component,
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
    <div className="bg-dots min-h-screen bg-ink text-fg font-sans antialiased selection:bg-fg/10">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5 font-serif text-2xl leading-none tracking-tight text-fg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={28} height={28} className="rounded-md" />
            Arkitype
            <BetaTag />
          </button>

          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/docs"
              className="hidden rounded-lg px-4 py-2.5 text-[15px] font-medium text-fg-dim transition-colors hover:text-fg md:block"
            >
              Docs
            </Link>
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
              className="rounded-lg bg-fg px-5 py-2.5 text-[15px] font-medium text-ink transition hover:-translate-y-0.5 hover:opacity-90"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero — fills the first viewport ────────────────────── */}
      <section className="relative flex min-h-screen items-center overflow-hidden border-b border-line/60">
        <div className="mx-auto grid w-full max-w-[1400px] items-center gap-20 px-8 py-20 lg:grid-cols-[1.05fr,1fr] lg:gap-16 xl:px-12">
          <div>
            <Reveal>
              <p className="mb-7 text-sm font-medium uppercase tracking-[0.2em] text-fg-mute">
                Design-system builder · Public beta
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="max-w-2xl font-serif text-6xl leading-[1.05] tracking-tight text-fg sm:text-7xl lg:text-8xl">
                Build the system
                <br />
                before the screens.
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mt-9 max-w-xl text-xl leading-relaxed text-fg-dim">
                A guided builder that turns a single brand colour into a complete,
                accessible design system — tokens, fifty components, and a Figma
                bundle — across eight ordered steps.
              </p>
            </Reveal>

            <Reveal delay={270}>
              <div className="mt-11 flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  onClick={start}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-fg px-8 py-4 text-lg font-medium text-ink transition hover:-translate-y-0.5 hover:opacity-90"
                >
                  Get started
                  <ArrowRight size={20} />
                </button>
                <button
                  onClick={() => scrollTo("journey")}
                  className="inline-flex items-center justify-center rounded-lg border border-line-strong px-8 py-4 text-lg font-medium text-fg transition hover:-translate-y-0.5 hover:bg-ink-hover"
                >
                  See how it works
                </button>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="hidden lg:block">
            <HeroPanel />
          </Reveal>
        </div>
      </section>

      {/* ── Live demo ──────────────────────────────────────────── */}
      <LiveDemo />

      {/* ── The journey (real, useful, necessary info) ─────────── */}
      <section id="journey" className="border-t border-line/60">
        <div className="mx-auto max-w-[1400px] px-6 py-24 sm:py-28">
          <Reveal>
            <h2 className="font-serif text-4xl tracking-tight text-fg sm:text-5xl">
              Eight steps, in order
            </h2>
            <p className="mt-4 max-w-xl text-lg text-fg-dim">
              Each step builds on the last, so decisions compound instead of
              conflict. You always know what comes next.
            </p>
          </Reveal>

          <Reveal delay={120}>
          <ol className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
            {STEP_ORDER.map((id) => {
              const step = STEP_META[id];
              const Icon = STEP_ICONS[id];
              return (
                <li
                  key={id}
                  className="relative flex flex-col gap-4 bg-ink p-7 transition hover:z-10 hover:-translate-y-1 hover:bg-ink-hover"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-line-strong text-fg-dim">
                      <Icon size={18} />
                    </div>
                    <span className="font-serif text-2xl leading-none text-fg-mute">
                      {step.n}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-fg">{step.label}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-fg-mute">
                      {step.blurb}.
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
          </Reveal>

          <Reveal delay={180}>
            <Link
              href="/docs"
              className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-line-strong px-6 py-5 text-left transition hover:-translate-y-1 hover:bg-ink-hover"
            >
              <div>
                <h3 className="font-serif text-lg tracking-tight text-fg">Read the full documentation</h3>
                <p className="mt-1 text-sm text-fg-mute">
                  Every control in every step, the accessibility engine, and exactly what each export contains.
                </p>
              </div>
              <ArrowRight size={18} className="shrink-0 text-fg-mute" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── What you get ───────────────────────────────────────── */}
      <section className="border-t border-line/60">
        <div className="mx-auto max-w-[1400px] px-6 py-24 sm:py-28">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-fg-mute">
              What you get
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-fg sm:text-5xl">
              Everything included, out of the box
            </h2>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {HIGHLIGHTS.map((h, i) => (
              <Reveal key={h.title} delay={i * 100}>
                <div className="h-full rounded-xl border border-line-strong p-7 transition hover:-translate-y-1 hover:bg-ink-hover">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-line-strong text-fg-dim">
                    <h.icon size={20} />
                  </div>
                  <h3 className="mt-5 font-serif text-xl tracking-tight text-fg">
                    {h.title}
                  </h3>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-fg-dim">
                    {h.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={100}>
            <div className="mt-6 rounded-xl border border-line-strong p-7 sm:p-9">
              <h3 className="font-serif text-xl tracking-tight text-fg">
                Export to where you already work
              </h3>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-fg-dim">
                One system, compiled straight out to five formats — no
                separate build step to keep in sync.
              </p>
              <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {EXPORTS.map((e) => (
                  <div
                    key={e.label}
                    className="flex flex-col items-center gap-2.5 rounded-lg border border-line px-3 py-5 text-center transition hover:-translate-y-1 hover:border-line-strong hover:bg-ink-hover"
                  >
                    <e.icon size={20} className="text-fg-dim" />
                    <span className="text-[13px] leading-tight text-fg-dim">{e.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Closing CTA ────────────────────────────────────────── */}
      <section className="border-t border-line/60">
        <div className="mx-auto max-w-[1400px] px-6 py-24 text-center sm:py-32">
          <Reveal>
            <h2 className="mx-auto max-w-3xl font-serif text-5xl leading-[1.1] tracking-tight text-fg sm:text-6xl">
              Start with one colour.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base text-fg-dim">
              Name a system, pick a hue, and let every step follow from there.
            </p>
            <button
              onClick={start}
              className="mt-9 inline-flex items-center justify-center gap-2 rounded-lg bg-fg px-8 py-4 text-base font-medium text-ink transition hover:-translate-y-0.5 hover:opacity-90"
            >
              Get started
              <ArrowRight size={18} />
            </button>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-line/60">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-fg-mute sm:flex-row">
          <span className="flex items-center gap-2 font-serif text-lg tracking-tight text-fg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={20} height={20} className="rounded" />
            Arkitype
            <BetaTag />
          </span>
          <span>© {new Date().getFullYear()} Arkitype · Public beta</span>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="transition-colors hover:text-fg">
              Docs
            </Link>
            <button
              onClick={() => setView("login")}
              className="transition-colors hover:text-fg"
            >
              Sign in
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Hero panel ─────────────────────────────────────────────────────
 * A collage of real component skeletons — the "armature" the name
 * promises — but laid out on a grid instead of thrown at random angles:
 * each piece keeps its own slot, so the result reads as arranged, not
 * scattered. Pure chrome tokens (line/fg/ink), so it stays monochrome in
 * both themes and never competes with the user's system colour.
 * Decorative only: hidden from AT, no pointer events, desktop only. */

/** Placeholder text line. */
function Bone({ className = "" }: { className?: string }) {
  return <div className={`h-2 rounded-full bg-fg/15 ${className}`} />;
}

/** A collage tile — every piece gets the same card treatment and a small,
 *  consistent tilt (alternating direction) so the grid reads as a mood
 *  board, not a spreadsheet. */
function Tile({
  area,
  tilt = 0,
  className = "",
  children,
}: {
  area: string;
  tilt?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{ gridArea: area, "--tilt": `${tilt}deg` } as CSSProperties}
      className={`rotate-[var(--tilt)] rounded-xl border border-line-strong bg-ink p-5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.3)] transition-transform duration-300 ease-out hover:rotate-0 ${className}`}
    >
      {children}
    </div>
  );
}

function HeroPanel() {
  return (
    <div aria-hidden className="hero-cursor animate-fade-rise select-none">
      <div
        className="grid w-full gap-5"
        style={{
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateAreas:
            '"modal modal card card" "modal modal tooltip button" "toggles checks avatar avatar" "input input badges slider"',
        }}
      >
        {/* Modal — hero piece, flagship tile */}
        <Tile area="modal" tilt={-1.5} className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <Bone className="w-20 bg-fg/30" />
              <svg className="h-3 w-3 text-fg/40" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="space-y-2.5 pt-3.5">
              <Bone className="w-full" />
              <Bone className="w-5/6" />
              <Bone className="w-2/3" />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-3.5">
            <div className="flex h-8 w-14 items-center justify-center rounded-md border border-line-strong">
              <Bone className="w-7" />
            </div>
            <div className="flex h-8 w-16 items-center justify-center rounded-md bg-fg/85">
              <div className="h-2 w-8 rounded-full bg-ink/70" />
            </div>
          </div>
        </Tile>

        {/* Card with a cross-hatched media block */}
        <Tile area="card" tilt={1.5}>
          <div className="relative mb-3 h-10 overflow-hidden rounded-md border border-line">
            <svg className="absolute inset-0 h-full w-full text-fg/15" preserveAspectRatio="none" viewBox="0 0 100 100">
              <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div className="space-y-2">
            <Bone className="w-20 bg-fg/25" />
            <Bone className="w-full" />
          </div>
        </Tile>

        {/* Tooltip */}
        <Tile area="tooltip" tilt={2} className="flex items-center justify-center">
          <div className="rounded-md border border-line-strong bg-ink-panel px-2.5 py-2">
            <Bone className="w-10" />
          </div>
        </Tile>

        {/* Button with selection handles */}
        <Tile area="button" tilt={-2}>
          <div className="relative border border-dashed border-fg/40 p-1">
            <span className="absolute -left-1 -top-1 h-1.5 w-1.5 border border-fg/50 bg-ink" />
            <span className="absolute -right-1 -top-1 h-1.5 w-1.5 border border-fg/50 bg-ink" />
            <span className="absolute -bottom-1 -left-1 h-1.5 w-1.5 border border-fg/50 bg-ink" />
            <span className="absolute -bottom-1 -right-1 h-1.5 w-1.5 border border-fg/50 bg-ink" />
            <div className="flex h-7 items-center justify-center rounded-md border border-line-strong">
              <Bone className="w-10 bg-fg/30" />
            </div>
          </div>
        </Tile>

        {/* Toggles */}
        <Tile area="toggles" tilt={1.5} className="flex flex-col justify-center gap-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-9 items-center rounded-full bg-fg/30 pl-[18px]">
              <div className="h-3 w-3 rounded-full bg-ink" />
            </div>
            <Bone className="w-10" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-9 items-center rounded-full border border-line-strong pl-0.5">
              <div className="h-3 w-3 rounded-full bg-fg/30" />
            </div>
            <Bone className="w-8" />
          </div>
        </Tile>

        {/* Checkbox rows */}
        <Tile area="checks" tilt={-1.5} className="flex flex-col justify-center gap-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-3.5 w-3.5 items-center justify-center rounded border border-fg/40 bg-fg/25">
              <svg className="h-2 w-2 text-ink" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5.5L4 8l4.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <Bone className="w-14" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-3.5 rounded border border-line-strong" />
            <Bone className="w-10" />
          </div>
        </Tile>

        {/* Avatar row */}
        <Tile area="avatar" tilt={1} className="flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 rounded-full border border-line-strong bg-fg/10" />
          <div className="w-full space-y-1.5">
            <Bone className="w-20 bg-fg/25" />
            <Bone className="w-28" />
          </div>
        </Tile>

        {/* Input field */}
        <Tile area="input" tilt={-1}>
          <Bone className="mb-2 w-12" />
          <div className="flex h-8 items-center rounded-md border border-line-strong px-2.5">
            <Bone className="w-16 bg-fg/20" />
            <div className="ml-0.5 h-3.5 w-px bg-fg/50" />
          </div>
        </Tile>

        {/* Badges */}
        <Tile area="badges" tilt={2} className="flex items-center justify-center gap-1.5">
          <div className="flex h-6 items-center rounded-full border border-line-strong px-2.5">
            <Bone className="w-6" />
          </div>
          <div className="flex h-6 items-center rounded-full bg-fg/15 px-2.5">
            <Bone className="w-8 bg-fg/30" />
          </div>
        </Tile>

        {/* Slider */}
        <Tile area="slider" tilt={-2} className="flex items-center">
          <div className="relative h-1 w-full rounded-full bg-fg/15">
            <div className="h-1 w-2/3 rounded-full bg-fg/40" />
            <div className="absolute -top-1.5 left-2/3 h-4 w-4 -translate-x-1/2 rounded-full border border-fg/50 bg-ink" />
          </div>
        </Tile>
      </div>
    </div>
  );
}

/* ── Live demo ────────────────────────────────────────────────────
 * A working miniature of the builder, kept deliberately in skeleton
 * form: no words inside the canvas, just bones that answer the
 * controls. The one colour on screen is the one the visitor picks —
 * the same rule the real tool lives by. */

const DEMO_HUES = [
  { name: "Indigo", value: "#6366F1" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Emerald", value: "#22C55E" },
  { name: "Sky", value: "#0EA5E9" },
] as const;

type DemoScale = "compact" | "regular" | "display";
type DemoSize = "sm" | "md" | "lg";
type DemoState = "rest" | "hover" | "focus" | "disabled";
type DemoRadius = "sharp" | "soft" | "round";
type DemoMode = "light" | "dark";

/** Segmented control for the demo panel, in the site's quiet chrome. */
function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-fg-mute">
        {label}
      </p>
      <div className="inline-flex overflow-hidden rounded-lg border border-line">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              value === o.value
                ? "bg-fg text-ink"
                : "text-fg-dim hover:bg-ink-hover hover:text-fg"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LiveDemo() {
  const [hue, setHue] = useState<string>(DEMO_HUES[0].value);
  const [scale, setScale] = useState<DemoScale>("regular");
  const [size, setSize] = useState<DemoSize>("md");
  const [btnState, setBtnState] = useState<DemoState>("rest");
  const [radius, setRadius] = useState<DemoRadius>("soft");
  const [mode, setMode] = useState<DemoMode>("dark");

  // Canvas palette is self-contained (the mini-app has its own theme,
  // independent of the page chrome).
  const c =
    mode === "dark"
      ? {
          bg: "#101013",
          panel: "#18181c",
          line: "rgba(255,255,255,0.13)",
          bone: "rgba(255,255,255,0.14)",
          boneStrong: "rgba(255,255,255,0.36)",
          mixTo: "#ffffff",
        }
      : {
          bg: "#fafaf9",
          panel: "#ffffff",
          line: "rgba(17,17,17,0.13)",
          bone: "rgba(17,17,17,0.12)",
          boneStrong: "rgba(17,17,17,0.32)",
          mixTo: "#000000",
        };

  const r = { sharp: 2, soft: 10, round: 999 }[radius];
  const heading = {
    compact: { h: 14, w: 150 },
    regular: { h: 22, w: 200 },
    display: { h: 32, w: 250 },
  }[scale];
  const btn = {
    sm: { h: 34, w: 104, bone: 44 },
    md: { h: 42, w: 128, bone: 56 },
    lg: { h: 52, w: 152, bone: 68 },
  }[size];

  const btnBg =
    btnState === "hover" ? `color-mix(in srgb, ${hue} 82%, ${c.mixTo})` : hue;
  const btnShadow =
    btnState === "focus"
      ? `0 0 0 2px ${c.panel}, 0 0 0 5px color-mix(in srgb, ${hue} 55%, transparent)`
      : "none";

  // Five-step ramp from the single hue — the builder's core trick in miniature.
  const ramp = [
    `color-mix(in oklab, ${hue} 15%, ${c.bg})`,
    `color-mix(in oklab, ${hue} 40%, ${c.bg})`,
    `color-mix(in oklab, ${hue} 70%, ${c.bg})`,
    hue,
    `color-mix(in oklab, ${hue} 72%, ${mode === "dark" ? "#000" : "#1a1a1c"})`,
  ];

  const bone = (w: number | string, h = 8, color = c.bone) => (
    <div style={{ width: w, height: h, background: color, borderRadius: 999 }} className="transition-all duration-300" />
  );

  return (
    <section id="demo" className="border-t border-line/60">
      <div className="mx-auto max-w-[1400px] px-6 py-24 sm:py-28">
        <Reveal>
          <h2 className="font-serif text-4xl tracking-tight text-fg sm:text-5xl">
            Try it.
          </h2>
          <p className="mt-3 max-w-xl text-base text-fg-dim">
            A working miniature of the builder — kept in wireframe on purpose so
            you watch the decisions, not the pixels. One colour drives everything.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[320px,1fr] lg:items-start">
          {/* Controls */}
          <Reveal delay={100} className="flex flex-col gap-6">
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-fg-mute">
                Colour
              </p>
              <div className="flex gap-2.5">
                {DEMO_HUES.map((h) => (
                  <button
                    key={h.value}
                    aria-label={`Use ${h.name}`}
                    aria-pressed={hue === h.value}
                    onClick={() => setHue(h.value)}
                    className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                      hue === h.value ? "ring-2 ring-fg ring-offset-2 ring-offset-ink scale-110" : ""
                    }`}
                    style={{ background: h.value }}
                  />
                ))}
              </div>
            </div>

            <Seg<DemoScale>
              label="Type scale"
              value={scale}
              onChange={setScale}
              options={[
                { value: "compact", label: "Compact" },
                { value: "regular", label: "Regular" },
                { value: "display", label: "Display" },
              ]}
            />
            <Seg<DemoSize>
              label="Button size"
              value={size}
              onChange={setSize}
              options={[
                { value: "sm", label: "S" },
                { value: "md", label: "M" },
                { value: "lg", label: "L" },
              ]}
            />
            <Seg<DemoState>
              label="Button state"
              value={btnState}
              onChange={setBtnState}
              options={[
                { value: "rest", label: "Rest" },
                { value: "hover", label: "Hover" },
                { value: "focus", label: "Focus" },
                { value: "disabled", label: "Disabled" },
              ]}
            />
            <Seg<DemoRadius>
              label="Radius"
              value={radius}
              onChange={setRadius}
              options={[
                { value: "sharp", label: "Sharp" },
                { value: "soft", label: "Soft" },
                { value: "round", label: "Round" },
              ]}
            />
            <Seg<DemoMode>
              label="Theme"
              value={mode}
              onChange={setMode}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </Reveal>

          {/* Canvas — a mini app window made of bones */}
          <Reveal delay={180} className="order-first lg:order-none">
          <div
            aria-label="Skeleton preview canvas"
            className="rounded-2xl border p-5 transition-colors duration-300 sm:p-7"
            style={{ background: c.bg, borderColor: c.line }}
          >
            {/* window chrome */}
            <div className="mb-5 flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: c.bone }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: c.bone }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: c.bone }} />
              <div
                className="ml-3 h-5 flex-1 transition-all duration-300"
                style={{ background: c.panel, border: `1px solid ${c.line}`, borderRadius: Math.min(r, 8) }}
              />
            </div>

            <div
              className="border p-5 transition-all duration-300 sm:p-6"
              style={{ background: c.panel, borderColor: c.line, borderRadius: Math.min(r, 16) }}
            >
              {/* type scale bones */}
              <div className="space-y-2.5">
                {bone(heading.w, heading.h, c.boneStrong)}
                {bone("82%")}
                {bone("64%")}
              </div>

              {/* colour ramp from the chosen hue */}
              <div className="mt-6 flex gap-1.5">
                {ramp.map((step, i) => (
                  <div
                    key={i}
                    className="h-9 flex-1 transition-all duration-300"
                    style={{ background: step, borderRadius: Math.min(r, 8) }}
                  />
                ))}
              </div>

              {/* input */}
              <div className="mt-6">
                <div className="mb-2">{bone(56, 7)}</div>
                <div
                  className="flex h-10 items-center px-3 transition-all duration-300"
                  style={{ border: `1px solid ${c.line}`, borderRadius: r === 999 ? 999 : r }}
                >
                  {bone(96, 7)}
                  <div className="ml-1 h-4 w-px" style={{ background: c.boneStrong }} />
                </div>
              </div>

              {/* buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div
                  className="flex items-center justify-center transition-all duration-300"
                  style={{
                    height: btn.h,
                    width: btn.w,
                    background: btnBg,
                    borderRadius: r,
                    boxShadow: btnShadow,
                    opacity: btnState === "disabled" ? 0.4 : 1,
                  }}
                >
                  {bone(btn.bone, 7, "rgba(255,255,255,0.9)")}
                </div>
                <div
                  className="flex items-center justify-center transition-all duration-300"
                  style={{
                    height: btn.h,
                    width: btn.w * 0.82,
                    border: `1px solid ${c.line}`,
                    borderRadius: r,
                  }}
                >
                  {bone(btn.bone * 0.8, 7, c.boneStrong)}
                </div>
              </div>

              {/* toggle + badges */}
              <div className="mt-6 flex flex-wrap items-center gap-5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-5 w-9 items-center pl-[18px] transition-colors duration-300"
                    style={{ background: hue, borderRadius: 999 }}
                  >
                    <div className="h-3.5 w-3.5 rounded-full bg-white" />
                  </div>
                  {bone(48, 7)}
                </div>
                <div
                  className="flex h-6 items-center px-3 transition-all duration-300"
                  style={{
                    background: `color-mix(in srgb, ${hue} 16%, transparent)`,
                    borderRadius: r === 2 ? 4 : 999,
                  }}
                >
                  {bone(36, 6, hue)}
                </div>
                <div
                  className="flex h-6 items-center px-3 transition-all duration-300"
                  style={{ border: `1px solid ${c.line}`, borderRadius: r === 2 ? 4 : 999 }}
                >
                  {bone(28, 6)}
                </div>
              </div>
            </div>
          </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
