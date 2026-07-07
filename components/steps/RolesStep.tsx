"use client";

/**
 * Step 06 — Roles. The semantic layer, and the one you'll edit and preview most.
 *  • Expansive: roles and groups live in state — add, rename and remove them, and
 *    the defaults now cover surfaces, text, two action tiers, borders and full
 *    feedback families (info / success / warning / error).
 *  • Controllable: a role can point at a ramp step OR carry a raw hex — pick a
 *    swatch to bind, or open the colour well for a literal value.
 *  • Felt immediately: a live in-context card renders in both modes beside the
 *    matrix, and the WCAG audit re-checks contrast on every change.
 */
import { useEffect, useMemo, useState } from "react";
import {
  PreviewMode,
  useDesignSystem,
} from "@/store/useDesignSystem";
import { isValidHex, rampStepLabels, wcagVerdict } from "@/lib/color";
import { resolveRef, resolveToken, rv, sv, tv } from "@/lib/tokens";
import {
  AsideDivider,
  AsideNote,
  CanvasSection,
  SelectControl,
  WcagBadge,
} from "@/components/ui/controls";
import { ThemeFrame } from "@/components/ui/ThemeFrame";
import { Plus, Trash2 } from "lucide-react";

const A11Y_PAIRS: Array<[bg: string, fg: string, context: string]> = [
  ["surface-base", "text-primary", "Body on base"],
  ["surface-base", "text-secondary", "Secondary on base"],
  ["surface-base", "text-muted", "Muted on base"],
  ["surface-elevated", "text-primary", "Body on cards"],
  ["surface-subtle", "text-secondary", "Secondary on subtle"],
  ["action-primary-default", "text-on-action", "Button label"],
  ["action-primary-hover", "text-on-action", "Button label, hover"],
  ["action-primary-active", "text-on-action", "Button label, active"],
];

function useRefOptions() {
  const families = useDesignSystem((s) => s.primitives.colorFamilies);
  return useMemo(
    () =>
      families.flatMap((f) =>
        rampStepLabels(f.steps).map((step) => ({
          label: `${f.id}-${step}`,
          value: `${f.id}-${step}`,
        }))
      ),
    [families]
  );
}

function TokenCell({ mode, token }: { mode: PreviewMode; token: string }) {
  const primitives = useDesignSystem((s) => s.primitives);
  const value = useDesignSystem((s) => s.semantics.modes[mode][token]);
  const setSemantic = useDesignSystem((s) => s.setSemantic);
  const refOptions = useRefOptions();
  const hex = resolveRef(primitives, value);
  const isHex = typeof value === "string" && value.startsWith("#");
  const options = isHex
    ? [{ label: `Custom ${value.toUpperCase()}`, value }, ...refOptions]
    : refOptions;

  return (
    <div className="flex items-center gap-2">
      <label
        className="h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-line-strong"
        style={{ background: hex }}
        title={`${hex} — click for a raw hex value`}
      >
        <input
          type="color"
          aria-label={`${token} ${mode} colour`}
          value={isValidHex(hex) ? hex : "#000000"}
          onChange={(e) => setSemantic(mode, token, e.target.value)}
          className="h-0 w-0 opacity-0"
        />
      </label>
      <div className="min-w-0 flex-1">
        <SelectControl
          compact
          value={value ?? ""}
          options={options}
          onChange={(v) => setSemantic(mode, token, v)}
        />
      </div>
    </div>
  );
}

/** Live composed surface exercising the roles, rendered per mode. */
function RolesInContext({ mode }: { mode: PreviewMode }) {
  return (
    <ThemeFrame mode={mode} label={mode === "light" ? "Light" : "Dark"}>
      <div style={{ background: tv("surface-base"), padding: sv(4) }}>
        <div
          style={{
            background: tv("surface-elevated"),
            border: `1px solid ${tv("border-default")}`,
            borderRadius: rv(4),
            boxShadow: "var(--ark-shadow-medium)",
            padding: sv(4),
            display: "flex",
            flexDirection: "column",
            gap: sv(2),
          }}
        >
          <span style={{ color: tv("text-muted"), fontSize: "var(--ark-text-xs)" }}>
            Billing · overview
          </span>
          <span
            style={{ color: tv("text-primary"), fontSize: "var(--ark-text-xl)", fontWeight: 700 }}
          >
            Your plan renews Friday
          </span>
          <span style={{ color: tv("text-secondary"), fontSize: "var(--ark-text-sm)" }}>
            Every colour here is a role — remap one and this card follows.{" "}
            <span style={{ color: tv("text-link") }}>View invoice</span>
          </span>

          <div
            style={{
              marginTop: sv(1),
              background: tv("feedback-success-surface"),
              border: `1px solid ${tv("feedback-success-border")}`,
              color: tv("feedback-success-text"),
              borderRadius: rv(3),
              padding: `${sv(2)} ${sv(3)}`,
              fontSize: "var(--ark-text-xs)",
            }}
          >
            Payment method confirmed.
          </div>

          <div style={{ display: "flex", gap: sv(2), marginTop: sv(1) }}>
            <button
              style={{
                background: tv("action-primary-default"),
                color: tv("text-on-action"),
                border: "1px solid transparent",
                borderRadius: rv(2),
                padding: `${sv(1)} ${sv(3)}`,
                fontSize: "var(--ark-text-sm)",
                fontWeight: 600,
              }}
            >
              Manage plan
            </button>
            <button
              style={{
                background: tv("action-secondary-default"),
                color: tv("text-primary"),
                border: `1px solid ${tv("border-default")}`,
                borderRadius: rv(2),
                padding: `${sv(1)} ${sv(3)}`,
                fontSize: "var(--ark-text-sm)",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </ThemeFrame>
  );
}

function AddRow({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
}) {
  const [text, setText] = useState("");
  const commit = () => {
    const v = text.trim();
    if (v) {
      onAdd(v);
      setText("");
    }
  };
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        className="h-7 min-w-0 flex-1 rounded-md border border-line bg-ink-panel px-2 text-[11px] text-fg placeholder:text-fg-mute focus:border-line-strong focus:outline-none"
      />
      <button
        type="button"
        onClick={commit}
        className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
      >
        <Plus size={11} />
        Add
      </button>
    </div>
  );
}

/** The roles contrast audit — shared by the aside, footer note and canvas. */
export function useRolesAudit() {
  const primitives = useDesignSystem((s) => s.primitives);
  const semantics = useDesignSystem((s) => s.semantics);
  return useMemo(() => {
    const stateSlice = { primitives, semantics };
    const verdicts = (["light", "dark"] as PreviewMode[]).flatMap((mode) =>
      A11Y_PAIRS.map(([bg, fg, context]) => ({
        mode,
        bg,
        fg,
        context,
        verdict: wcagVerdict(
          resolveToken(stateSlice, mode, bg),
          resolveToken(stateSlice, mode, fg)
        ),
        bgHex: resolveToken(stateSlice, mode, bg),
        fgHex: resolveToken(stateSlice, mode, fg),
      }))
    );
    const aaPass = verdicts.filter((v) => v.verdict.aa).length;
    const aaaPass = verdicts.filter((v) => v.verdict.aaa).length;
    const failures = verdicts.length - aaPass;
    return { verdicts, aaPass, aaaPass, failures };
  }, [primitives, semantics]);
}

/** Footer note for the Roles tab: AA pass/fail summary. */
export function RolesFooterNote() {
  const { verdicts, failures } = useRolesAudit();
  return failures > 0 ? (
    <span className="text-amber-400/90">
      {failures} pairing{failures === 1 ? "" : "s"} below AA — consider fixing
      before shipping
    </span>
  ) : (
    <span className="text-fg-mute">All {verdicts.length} pairings pass AA</span>
  );
}

/** The Roles tab's aside (notes + contrast audit summary + add group). */
export function RolesAside() {
  const addGroup = useDesignSystem((s) => s.addGroup);
  const { verdicts, aaPass, aaaPass } = useRolesAudit();

  return (
    <>
      <AsideNote>
        This is the layer that makes light and dark <em>one</em> system: the
        same role resolves to different steps per mode.
      </AsideNote>
      <AsideNote>
        Bind a role to a ramp step from its dropdown, or click its colour well
        for a raw hex when a value has to be exact.
      </AsideNote>

      <AsideDivider />

      <div className="mb-6 rounded-xl border border-line p-4">
        <p className="mb-3 text-[12px] font-medium text-fg-dim">Contrast audit</p>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-fg-mute">AA · 4.5:1</span>
            <span
              className={`font-mono text-[12px] ${
                aaPass === verdicts.length ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {aaPass} / {verdicts.length}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-fg-mute">AAA · 7:1</span>
            <span className="font-mono text-[12px] text-fg-dim">
              {aaaPass} / {verdicts.length}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-[12px] font-medium text-fg-dim">Add a group</p>
        <AddRow placeholder="e.g. Chart" onAdd={addGroup} />
      </div>

      <AsideNote>
        AA is the shipping bar. AAA is worth chasing for body copy but is often
        impractical for muted text.
      </AsideNote>
    </>
  );
}

/** The Roles tab's canvas (in-context card, role matrix, contrast audit). */
export function RolesCanvas() {
  const semantics = useDesignSystem((s) => s.semantics);
  const groups = semantics.groups;
  const addRole = useDesignSystem((s) => s.addRole);
  const removeRole = useDesignSystem((s) => s.removeRole);
  const pendingFocus = useDesignSystem((s) => s.pendingFocus);
  const setPendingFocus = useDesignSystem((s) => s.setPendingFocus);
  const { verdicts } = useRolesAudit();

  const [flashToken, setFlashToken] = useState<string | null>(null);
  useEffect(() => {
    if (pendingFocus?.step !== "roles") return;
    const anchor = pendingFocus.anchor;
    document.getElementById(`role-${anchor}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    setFlashToken(anchor);
    setPendingFocus(null);
    const t = setTimeout(() => setFlashToken(null), 1500);
    return () => clearTimeout(t);
  }, [pendingFocus, setPendingFocus]);

  return (
    <>
      <CanvasSection title="In context" hint="the roles, live in both modes">
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <RolesInContext mode="light" />
          <RolesInContext mode="dark" />
        </div>
      </CanvasSection>

      <CanvasSection title="Role matrix" hint="light and dark · bind a step or a hex">
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="grid grid-cols-[160px_1fr_1fr] gap-x-4 border-b border-line bg-ink-panel px-5 py-2.5">
            <span className="text-[11px] font-medium text-fg-mute">Role</span>
            <span className="text-[11px] font-medium text-fg-mute">Light</span>
            <span className="text-[11px] font-medium text-fg-mute">Dark</span>
          </div>
          {groups.map((group) => (
            <div key={group.label}>
              <div className="border-b border-line bg-ink-panel/50 px-5 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-mute">
                {group.label}
              </div>
              {group.tokens.map((token) => (
                <div
                  key={token}
                  id={`role-${token}`}
                  className={`group grid grid-cols-[160px_1fr_1fr] items-center gap-x-4 border-b border-line px-5 py-2.5 last:border-b-0 transition-colors hover:bg-ink-panel/40 ${
                    flashToken === token ? "bg-ink-panel ring-1 ring-inset ring-fg" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="min-w-0 break-words font-mono text-[11px] leading-snug text-fg-dim">
                      {token}
                    </span>
                    <button
                      type="button"
                      title="Remove role"
                      onClick={() => removeRole(token)}
                      className="shrink-0 rounded p-0.5 text-fg-mute opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <TokenCell mode="light" token={token} />
                  <TokenCell mode="dark" token={token} />
                </div>
              ))}
              <div className="border-b border-line px-5 py-2 last:border-b-0">
                <AddRow
                  placeholder="add role to this group…"
                  onAdd={(name) => addRole(group.label, name)}
                />
              </div>
            </div>
          ))}
        </div>
      </CanvasSection>

      <CanvasSection title="Contrast audit" hint="every text-on-surface pairing, both modes">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {(["light", "dark"] as PreviewMode[]).map((mode) => (
            <div key={mode} className="rounded-xl border border-line p-4">
              <p className="mb-3 text-[12px] font-medium capitalize text-fg-dim">
                {mode} mode
              </p>
              <div className="space-y-1.5">
                {verdicts
                  .filter((v) => v.mode === mode)
                  .map((v) => (
                    <div
                      key={`${v.mode}-${v.bg}-${v.fg}`}
                      className="flex items-center gap-3 rounded-lg border border-line/70 px-2.5 py-2"
                    >
                      <div
                        className="flex h-8 w-12 shrink-0 items-center justify-center rounded-md border border-line-strong text-[11px] font-semibold"
                        style={{ background: v.bgHex, color: v.fgHex }}
                      >
                        Aa
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] text-fg-dim">{v.context}</div>
                        <div className="font-mono text-[10px] tabular-nums text-fg-mute">
                          {v.verdict.ratio}:1
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <WcagBadge tier="AA" pass={v.verdict.aa} />
                        <WcagBadge tier="AAA" pass={v.verdict.aaa} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </CanvasSection>
    </>
  );
}
