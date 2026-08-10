"use client";

/**
 * The contrast audit — the live WCAG health of the colour system.
 *
 * Three things make it *live* rather than decorative:
 *  • Pairings are derived from the token graph on every render (see
 *    `derivePairs`), so a renamed role, a new group or a component token starts
 *    being audited the moment it exists.
 *  • Both modes are computed every time; the view just chooses what to show.
 *  • Every failure carries a repair. "Fix" walks the failing foreground to the
 *    nearest ramp step (or solves a hex) that clears the tier, and every repair
 *    is individually reversible.
 */
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { ArkitypeState, PreviewMode, modeDefsOf, useDesignSystem } from "@/store/useDesignSystem";
import { resolveToken } from "@/lib/tokens";
import { checkContrast, thresholdFor, tierApplies, type A11yTier } from "@/lib/a11y";
import { derivePairs, type RoleContrastPair } from "@/lib/a11yPairs";
import {
  buildFixContext,
  proposeContrastFix,
  terminalToken,
  type ContrastFix,
  type FixContext,
} from "@/lib/a11yFix";
import { CanvasSection, InfoTip, Tooltip, WcagBadge } from "@/components/ui/controls";
import { RotateCcw, Sparkles, TriangleAlert, Check } from "lucide-react";

/* ────────────────────────── the audit itself ────────────────────────── */

export interface Verdict {
  key: string;
  mode: PreviewMode;
  pair: RoleContrastPair;
  /** The token a fix would actually write (end of the "@role" alias chain). */
  target: string;
  fgHex: string;
  bgHex: string;
  ratio: number;
  aa: boolean;
  aaa: boolean | null;
  /** Reported but excluded from the score — see `RoleContrastPair.advisory`. */
  advisory: boolean;
  /** Per-mode pairing graph, built once and shared by every row's fix button. */
  fixContext: FixContext;
}

/**
 * Every pairing in the system, in every mode. Recomputed whenever primitives or
 * semantics change — which is every colour edit, rename, add or remove.
 */
export function useContrastAudit() {
  const primitives = useDesignSystem((s) => s.primitives);
  const semantics = useDesignSystem((s) => s.semantics);

  return useMemo(() => {
    const state = { primitives, semantics };
    const pairs = derivePairs(semantics.groups);
    const verdicts: Verdict[] = [];

    // Every mode the file carries, not the two it used to be limited to: an
    // audit that quietly skips a High-contrast column is the one column it had
    // the most business checking.
    for (const { id: mode } of modeDefsOf(semantics)) {
      const fixContext = buildFixContext(state, mode);
      for (const pair of pairs) {
        const fgHex = resolveToken(state, mode, pair.fg);
        const bgHex = resolveToken(state, mode, pair.bg);
        const check = checkContrast(fgHex, bgHex, pair.context);
        verdicts.push({
          key: `${mode}|${pair.fg}|${pair.bg}|${pair.context}`,
          mode,
          pair,
          target: terminalToken(state, mode, pair.fg),
          fgHex,
          bgHex,
          ratio: check.ratio,
          aa: check.level === "AA" || check.level === "AAA",
          aaa: tierApplies(pair.context, "AAA") ? check.level === "AAA" : null,
          advisory: !!pair.advisory,
          fixContext,
        });
      }
    }

    // Scores are computed over gated pairings only, so advisory rows can be
    // shown in full without ever making a compliant system look broken.
    const gated = verdicts.filter((v) => !v.advisory);
    const aaPass = gated.filter((v) => v.aa).length;
    const aaaScope = gated.filter((v) => v.aaa !== null);
    const aaaPass = aaaScope.filter((v) => v.aaa).length;

    return {
      verdicts,
      total: gated.length,
      aaPass,
      aaaPass,
      aaaTotal: aaaScope.length,
      failures: gated.length - aaPass,
      advisoryLow: verdicts.filter((v) => v.advisory && !v.aa).length,
    };
  }, [primitives, semantics]);
}

/* ───────────────────── repair history (session-scoped) ───────────────── */

interface FixRecord {
  mode: PreviewMode;
  token: string;
  /** The value in place before the *first* repair of this token. */
  from: string;
  to: string;
  label: string;
}

/**
 * Undo state for repairs. Deliberately outside the design store: it is an
 * editing affordance, not part of the system being designed, so it must never
 * reach a saved project blob or an export.
 */
const fixStore = (() => {
  let records: FixRecord[] = [];
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get: () => records,
    record(next: FixRecord) {
      const prior = records.find((r) => r.mode === next.mode && r.token === next.token);
      records = prior
        ? records.map((r) => (r === prior ? { ...next, from: prior.from } : r))
        : [...records, next];
      emit();
    },
    drop(mode: PreviewMode, token: string) {
      records = records.filter((r) => !(r.mode === mode && r.token === token));
      emit();
    },
    clear() {
      records = [];
      emit();
    },
  };
})();

const EMPTY: FixRecord[] = [];

function useFixHistory(): FixRecord[] {
  return useSyncExternalStore(fixStore.subscribe, fixStore.get, () => EMPTY);
}

/** Apply a proposal and remember what it replaced. */
function applyFix(fix: ContrastFix, label: string) {
  useDesignSystem.getState().setSemantic(fix.mode, fix.token, fix.to);
  fixStore.record({ mode: fix.mode, token: fix.token, from: fix.from, to: fix.to, label });
}

function undoFix(record: FixRecord) {
  useDesignSystem.getState().setSemantic(record.mode, record.token, record.from);
  fixStore.drop(record.mode, record.token);
}

/** Gated pairings currently clearing AA, across every mode — the fix-all yardstick. */
function gatedAaPasses(state: Pick<ArkitypeState, "primitives" | "semantics">): number {
  const pairs = derivePairs(state.semantics.groups);
  let passes = 0;
  for (const { id: mode } of modeDefsOf(state.semantics)) {
    for (const pair of pairs) {
      if (pair.advisory) continue;
      const check = checkContrast(
        resolveToken(state, mode, pair.fg),
        resolveToken(state, mode, pair.bg),
        pair.context
      );
      if (check.level !== "fail") passes += 1;
    }
  }
  return passes;
}

/**
 * Repair every failure at a tier. Each write is proposed against freshly-read
 * state, because fixing one shared role (`text-muted`, say) usually settles
 * several pairings at once and would otherwise be "fixed" twice.
 *
 * Every write is also checked: a token can be pulled in two directions by two
 * pairings, and a repair that satisfies one while breaking another is not a
 * repair. Those are rolled back and left for the designer, who can see both
 * constraints and pick which one gives.
 */
function fixAll(tier: A11yTier, scope?: PreviewMode) {
  const seed = useDesignSystem.getState();
  const pairs = derivePairs(seed.semantics.groups);
  const modes: PreviewMode[] = scope
    ? [scope]
    : modeDefsOf(seed.semantics).map((d) => d.id);

  for (const mode of modes) {
    const context = buildFixContext(useDesignSystem.getState(), mode);
    for (const pair of pairs) {
      // Advisory pairings are the designer's call, never a bulk rewrite.
      if (pair.advisory) continue;
      if (!tierApplies(pair.context, tier)) continue;

      const before = useDesignSystem.getState();
      const fix = proposeContrastFix(before, mode, pair, tier, context);
      if (!fix) continue;

      const scoreBefore = gatedAaPasses(before);
      applyFix(fix, pair.label);
      if (gatedAaPasses(useDesignSystem.getState()) < scoreBefore) undoFix(fixRecordFor(fix));
    }
  }
}

const fixRecordFor = (fix: ContrastFix): FixRecord => ({
  mode: fix.mode,
  token: fix.token,
  from: fixStore.get().find((r) => r.mode === fix.mode && r.token === fix.token)?.from ?? fix.from,
  to: fix.to,
  label: "",
});

/* ────────────────────────────── row actions ─────────────────────────── */

function FixButton({ verdict, tier }: { verdict: Verdict; tier: A11yTier }) {
  const primitives = useDesignSystem((s) => s.primitives);
  const semantics = useDesignSystem((s) => s.semantics);

  const proposal = useMemo(
    () =>
      proposeContrastFix(
        { primitives, semantics },
        verdict.mode,
        verdict.pair,
        tier,
        verdict.fixContext
      ),
    [primitives, semantics, verdict.mode, verdict.pair, verdict.fixContext, tier]
  );

  if (!proposal) return null;

  const target = thresholdFor(verdict.pair.context, tier);
  return (
    <Tooltip
      side="left"
      content={
        <>
          Retargets <span className="font-mono text-fg">{proposal.token}</span> from{" "}
          <span className="font-mono text-fg">{proposal.from}</span> to{" "}
          <span className="font-mono text-fg">{proposal.to}</span> — {proposal.ratio}:1
          {proposal.short ? (
            <> , the most this surface allows (still under {target}:1 — move the surface too).</>
          ) : (
            <> , clearing {tier}&apos;s {target}:1.</>
          )}
          {proposal.via === "ramp" ? " The token stays bound to its ramp." : " Pinned as a raw hex."}
        </>
      }
    >
      <button
        type="button"
        onClick={() => applyFix(proposal, verdict.pair.label)}
        className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
      >
        <Sparkles size={9} />
        Fix {tier}
      </button>
    </Tooltip>
  );
}

function UndoButton({ record }: { record: FixRecord }) {
  return (
    <Tooltip
      side="left"
      content={
        <>
          Puts <span className="font-mono text-fg">{record.token}</span> back to{" "}
          <span className="font-mono text-fg">{record.from}</span> in {record.mode} mode.
        </>
      }
    >
      <button
        type="button"
        onClick={() => undoFix(record)}
        className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-dim transition-colors hover:border-line-strong hover:text-fg"
      >
        <RotateCcw size={9} />
        Undo
      </button>
    </Tooltip>
  );
}

/* ────────────────────────────── the panel ───────────────────────────── */

type Scope = "failing" | "all";

function VerdictRow({ verdict, record }: { verdict: Verdict; record?: FixRecord }) {
  const setPendingFocus = useDesignSystem((s) => s.setPendingFocus);
  const failsAA = !verdict.aa && !verdict.advisory;
  const failsAAA = verdict.aaa === false && !verdict.advisory;

  return (
    <div
      className={`flex items-center gap-2.5 border-b border-line/60 px-2.5 py-1.5 last:border-b-0 ${
        failsAA ? "bg-red-500/[0.04]" : ""
      }`}
    >
      <div
        className="flex h-7 w-10 shrink-0 items-center justify-center rounded-md border border-line-strong text-[11px] font-semibold"
        style={{ background: verdict.bgHex, color: verdict.fgHex }}
        title={`${verdict.fgHex} on ${verdict.bgHex}`}
      >
        Aa
      </div>

      <button
        type="button"
        onClick={() => setPendingFocus({ step: "roles", anchor: verdict.target })}
        title={`Jump to ${verdict.target}`}
        className="min-w-0 flex-1 text-left"
      >
        <span className="block truncate text-[12px] capitalize text-fg-dim hover:text-fg">
          {verdict.pair.label}
        </span>
        <span className="block font-mono text-[10px] tabular-nums text-fg-mute">
          {verdict.ratio}:1
          {verdict.pair.context === "ui-component" ? " · non-text" : ""}
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        {verdict.advisory ? (
          <Tooltip
            side="left"
            content={
              <>
                Advisory. WCAG only requires 3:1 of non-text that carries meaning —
                a focus ring, a control&apos;s boundary, a state indicator. Purely
                decorative edges are exempt, so this is reported but left out of the
                score. Raise it anyway if this border is what identifies the control.
              </>
            }
          >
            <span className="inline-flex cursor-help items-center rounded-md bg-fg/5 px-1.5 py-0.5 text-[10px] font-bold text-fg-mute">
              {verdict.aa ? "3:1 ✓" : "Advisory"}
            </span>
          </Tooltip>
        ) : (
          <>
            <WcagBadge tier="AA" pass={verdict.aa} compact />
            <WcagBadge tier="AAA" pass={verdict.aaa} compact />
          </>
        )}
      </div>

      <div className="flex w-[132px] shrink-0 items-center justify-end gap-1">
        {failsAA ? <FixButton verdict={verdict} tier="AA" /> : null}
        {!failsAA && failsAAA ? <FixButton verdict={verdict} tier="AAA" /> : null}
        {verdict.advisory && !verdict.aa ? <FixButton verdict={verdict} tier="AA" /> : null}
        {record ? <UndoButton record={record} /> : null}
      </div>
    </div>
  );
}

function ScoreBar({ label, pass, total }: { label: string; pass: number; total: number }) {
  const pct = total === 0 ? 100 : Math.round((pass / total) * 100);
  const clear = pass === total;
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-fg-mute">{label}</span>
        <span
          className={`font-mono text-[11px] tabular-nums ${clear ? "text-emerald-400" : "text-amber-400"}`}
        >
          {pass} / {total}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            clear ? "bg-emerald-500" : "bg-amber-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ContrastPanel() {
  const { verdicts, total, aaPass, aaaPass, aaaTotal, failures, advisoryLow } =
    useContrastAudit();
  const currentMode = useDesignSystem((s) => s.currentPreviewMode);
  const history = useFixHistory();

  // Default to the shortest actionable view: just what's broken, if anything is.
  const [scope, setScope] = useState<Scope>(failures > 0 ? "failing" : "all");
  const [modeFilter, setModeFilter] = useState<PreviewMode | "all">("all");
  const semantics = useDesignSystem((s) => s.semantics);
  const modeDefs = useMemo(() => modeDefsOf(semantics), [semantics]);
  const modeNameOf = (id: string) => modeDefs.find((d) => d.id === id)?.name ?? id;

  const recordFor = useCallback(
    (v: Verdict) => history.find((r) => r.mode === v.mode && r.token === v.target),
    [history]
  );

  const shown = useMemo(() => {
    const byMode =
      modeFilter === "all" ? verdicts : verdicts.filter((v) => v.mode === modeFilter);
    if (scope === "all") return byMode;
    // "Issues" means things that actually fail a bar the system is held to.
    // Advisory rows are informational and would otherwise drown the real ones.
    return byMode.filter((v) => !v.advisory && (!v.aa || v.aaa === false));
  }, [verdicts, modeFilter, scope]);

  const grouped = useMemo(() => {
    const order: string[] = [];
    const map: Record<string, Verdict[]> = {};
    for (const v of shown) {
      const section = v.pair.section ?? "Other";
      const key = modeFilter === "all" ? `${modeNameOf(v.mode)} · ${section}` : section;
      if (!map[key]) {
        map[key] = [];
        order.push(key);
      }
      map[key].push(v);
    }
    return order.map((key) => ({ key, rows: map[key] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, modeFilter, modeDefs]);

  const aaFailsInView = shown.filter((v) => !v.aa && !v.advisory).length;
  const aaaFailsInView = shown.filter((v) => v.aa && v.aaa === false && !v.advisory).length;
  const issueCount = verdicts.filter(
    (v) => !v.advisory && (!v.aa || v.aaa === false)
  ).length;
  const fixScope = modeFilter === "all" ? undefined : modeFilter;

  return (
    <CanvasSection
      title="Contrast audit"
      hint={`${total} gated${advisoryLow > 0 ? ` · ${advisoryLow} advisory` : ""} · ${modeDefs.length} modes`}
      info={
        <>
          Every text-on-surface and border-on-surface pairing your token groups
          imply, checked in every mode on every edit. AA (4.5:1 text, 3:1
          non-text) is the shipping bar; AAA (7:1) is worth chasing for body copy.
          Fix retargets the foreground to the nearest ramp step that clears the
          bar — the surface never moves.
        </>
      }
      actions={
        <div className="flex items-center gap-1.5">
          <Segment
            value={modeFilter}
            onChange={setModeFilter}
            options={[
              ...modeDefs.map((m) => ({ label: m.name, value: m.id })),
              { label: "All", value: "all" },
            ]}
          />
          <Segment
            value={scope}
            onChange={setScope}
            options={[
              { label: issueCount > 0 ? `Issues ${issueCount}` : "Issues", value: "failing" },
              { label: "All", value: "all" },
            ]}
          />
        </div>
      }
    >
      <div className="overflow-hidden rounded-xl border border-line">
        {/* score header */}
        <div className="flex items-center gap-4 border-b border-line bg-ink-panel px-4 py-3">
          <ScoreBar label="AA · 4.5:1 text · 3:1 non-text" pass={aaPass} total={total} />
          <ScoreBar label="AAA · 7:1 text" pass={aaaPass} total={aaaTotal} />
          <div className="flex shrink-0 items-center gap-1.5">
            {aaFailsInView > 0 ? (
              <button
                type="button"
                onClick={() => fixAll("AA", fixScope)}
                className="inline-flex items-center gap-1 rounded-md border border-line bg-ink px-2 py-1 text-[11px] font-semibold text-fg-dim transition-colors hover:border-line-strong hover:text-fg"
              >
                <Sparkles size={10} />
                Fix all AA ({aaFailsInView})
              </button>
            ) : null}
            {aaFailsInView === 0 && aaaFailsInView > 0 ? (
              <button
                type="button"
                onClick={() => fixAll("AAA", fixScope)}
                className="inline-flex items-center gap-1 rounded-md border border-line bg-ink px-2 py-1 text-[11px] font-semibold text-fg-dim transition-colors hover:border-line-strong hover:text-fg"
              >
                <Sparkles size={10} />
                Fix all AAA ({aaaFailsInView})
              </button>
            ) : null}
            {history.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  const store = useDesignSystem.getState();
                  [...history].reverse().forEach((r) => store.setSemantic(r.mode, r.token, r.from));
                  fixStore.clear();
                }}
                className="inline-flex items-center gap-1 rounded-md border border-line bg-ink px-2 py-1 text-[11px] font-semibold text-fg-dim transition-colors hover:border-line-strong hover:text-fg"
              >
                <RotateCcw size={10} />
                Undo all ({history.length})
              </button>
            ) : null}
          </div>
        </div>

        {/* rows */}
        {grouped.length === 0 ? (
          <p className="flex items-center gap-2 px-4 py-6 text-[12px] text-fg-mute">
            <Check size={13} className="text-emerald-400" />
            {scope === "failing"
              ? `Nothing to fix — all ${total} gated pairings clear AA${aaaPass === aaaTotal ? " and AAA" : ""} in every mode. Switch to All to see the advisory checks.`
              : "No pairings yet — add a group with a surface and a text token."}
          </p>
        ) : (
          grouped.map(({ key, rows }) => (
            <div key={key}>
              <div className="flex items-center gap-2 border-b border-line bg-ink-panel/50 px-3 py-1">
                <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-fg-mute">
                  {key}
                </span>
                {rows.some((r) => !r.aa && !r.advisory) ? (
                  <TriangleAlert size={10} className="text-red-400" />
                ) : null}
              </div>
              {rows.map((v) => (
                <VerdictRow key={v.key} verdict={v} record={recordFor(v)} />
              ))}
            </div>
          ))
        )}
      </div>

      {modeFilter !== "all" && modeFilter !== currentMode ? (
        <p className="mt-2 text-[11px] text-fg-mute">
          Showing {modeNameOf(modeFilter)} — the canvas is previewing {modeNameOf(currentMode)}.
        </p>
      ) : null}
    </CanvasSection>
  );
}

/* ── tiny local segmented control (the aside's `Segmented` is too heavy here) ── */

function Segment<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ label: string; value: T }>;
}) {
  return (
    <div className="inline-flex rounded-md border border-line bg-ink-panel p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
            value === o.value ? "bg-fg text-ink" : "text-fg-mute hover:text-fg-dim"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ────────────────────── compact summary for the aside ───────────────── */

export function ContrastSummary() {
  const { total, aaPass, aaaPass, aaaTotal, failures } = useContrastAudit();
  const history = useFixHistory();

  return (
    <div className="mb-4 rounded-xl border border-line p-3">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-fg-dim">
          Contrast
          <InfoTip label="About the contrast audit">
            Live WCAG check across every pairing your token groups imply, in both
            modes. It moves the moment you change a ramp, a role or a component
            token — the full breakdown, with one-click repairs, is on the canvas.
          </InfoTip>
        </span>
        {failures === 0 ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <Check size={11} /> Clear
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400">
            <TriangleAlert size={11} /> {failures}
          </span>
        )}
      </div>

      <div className="flex gap-3">
        <ScoreBar label="AA" pass={aaPass} total={total} />
        <ScoreBar label="AAA" pass={aaaPass} total={aaaTotal} />
      </div>

      {failures > 0 || history.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {failures > 0 ? (
            <button
              type="button"
              onClick={() => fixAll("AA")}
              className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-fg-dim transition-colors hover:border-line-strong hover:text-fg"
            >
              <Sparkles size={10} />
              Fix all AA
            </button>
          ) : null}
          {history.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                const store = useDesignSystem.getState();
                [...history].reverse().forEach((r) => store.setSemantic(r.mode, r.token, r.from));
                fixStore.clear();
              }}
              className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-fg-dim transition-colors hover:border-line-strong hover:text-fg"
            >
              <RotateCcw size={10} />
              Undo all ({history.length})
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Footer note for the Colour step: one line on AA health. */
export function ContrastFooterNote() {
  const { total, failures } = useContrastAudit();
  return failures > 0 ? (
    <span className="text-amber-400/90">
      {failures} pairing{failures === 1 ? "" : "s"} below AA — fix before shipping
    </span>
  ) : (
    <span className="text-fg-mute">All {total} pairings pass AA</span>
  );
}
