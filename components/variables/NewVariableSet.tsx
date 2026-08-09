"use client";

/**
 * Creating a new set of variables — from either surface.
 *
 * Two ways in, because there are two situations. You know exactly what you want
 * and need a blank set to name it in; or you're at the start of a system and the
 * fastest honest thing is a set that already holds a focus ring, a disabled
 * grey, six chart colours — the ten minutes every system spends the same way.
 *
 * A ready-made set arrives wired to *this* file's ramps and roles (see
 * `lib/tokenPresets.ts`), and lands as one write, so a single ⌘Z undoes it.
 */
import { useMemo, useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { useDesignSystem } from "@/store/useDesignSystem";
import { TIER_META } from "@/lib/variableGraph";
import {
  VARIABLE_SET_PRESETS,
  VariableSetPreset,
  presetNovelty,
  resolvePreset,
} from "@/lib/tokenPresets";
import { TierBadge } from "@/components/variables/VariableBits";

/**
 * The create panel: name a set and start it empty, or take one of the
 * ready-made ones. The presets exist because the first ten minutes of a new set
 * are always the same ten minutes — a focus ring, a disabled grey, six chart
 * colours — and none of it is the interesting part of the work.
 */
export function NewSetPanel({ onClose }: { onClose: (createdCollectionId?: string) => void }) {
  const semantics = useDesignSystem((s) => s.semantics);
  const colorFamilies = useDesignSystem((s) => s.primitives.colorFamilies);
  const createVariableSet = useDesignSystem((s) => s.createVariableSet);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<"semantic" | "component">("semantic");

  const existing = useMemo(
    () => new Set(Object.keys(semantics.modes.light)),
    [semantics.modes.light]
  );
  const familyIds = useMemo(() => colorFamilies.map((f) => f.id), [colorFamilies]);
  const takenLabels = useMemo(
    () => new Set(semantics.groups.map((g) => g.label)),
    [semantics.groups]
  );

  const createEmpty = () => {
    const label = name.trim();
    if (!label || takenLabels.has(label)) return;
    createVariableSet(label, kind, []);
    onClose(`${kind}:${label}`);
  };

  const apply = (preset: VariableSetPreset) => {
    const tokens = resolvePreset(preset, familyIds, existing);
    createVariableSet(preset.label, preset.kind, tokens);
    onClose(`${preset.kind}:${preset.label}`);
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-ink">
      <div className="flex h-[38px] shrink-0 items-center justify-between border-b border-line px-3">
        <span className="text-[11.5px] font-bold text-fg">New set of variables</span>
        <button
          type="button"
          onClick={() => onClose()}
          aria-label="Close"
          className="rounded p-1 text-fg-mute transition-colors hover:bg-ink-hover hover:text-fg"
        >
          <X size={12} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {/* start empty */}
        <div className="mx-auto max-w-[620px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-fg-mute">
            Start empty
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex shrink-0 rounded-md border border-line bg-ink-panel p-0.5">
              {(["semantic", "component"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  title={TIER_META[k].blurb}
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10.5px] font-semibold capitalize transition-colors ${
                    kind === k ? "bg-fg text-ink" : "text-fg-mute hover:text-fg"
                  }`}
                >
                  <TierBadge tier={k} size={11} />
                  {k === "semantic" ? "Role" : "Component"}
                </button>
              ))}
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createEmpty();
              }}
              placeholder={kind === "component" ? "e.g. Stepper" : "e.g. Chart"}
              className="h-8 min-w-0 flex-1 rounded-md border border-line bg-ink-panel px-2 text-[12px] text-fg placeholder:text-fg-mute focus:border-line-strong focus:outline-none"
            />
            <button
              type="button"
              onClick={createEmpty}
              disabled={!name.trim() || takenLabels.has(name.trim())}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-fg px-3 py-1.5 text-[11.5px] font-semibold text-ink transition-opacity disabled:opacity-30"
            >
              <Plus size={11} />
              Create
            </button>
          </div>
          {takenLabels.has(name.trim()) && name.trim() ? (
            <p className="mt-1.5 text-[10.5px] text-fg-mute">
              There&apos;s already a set called “{name.trim()}”.
            </p>
          ) : (
            <p className="mt-1.5 text-[10.5px] leading-snug text-fg-mute">
              {kind === "component"
                ? "Component tokens name one component's own colours, and usually point at a role."
                : "Roles name a job — what a colour is for — and point at a primitive."}
            </p>
          )}

          {/* ready-made */}
          <p className="mt-6 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-fg-mute">
            <Sparkles size={11} />
            Or take a ready-made one
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-fg-mute">
            Each one lands wired to your own ramps and roles — and as a single edit, so one ⌘Z puts
            it back.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {VARIABLE_SET_PRESETS.map((p) => {
              const { total, missing } = presetNovelty(p, existing);
              const done = missing === 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => !done && apply(p)}
                  disabled={done}
                  title={
                    done
                      ? `Every variable in ${p.label} is already in this file`
                      : `Add ${missing} of ${total} variables`
                  }
                  className={`rounded-lg border p-2.5 text-left transition-colors ${
                    done
                      ? "border-line bg-ink-panel/40 opacity-50"
                      : "border-line bg-ink-panel hover:border-line-strong hover:bg-ink-hover"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <TierBadge tier={p.kind} size={12} />
                    <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-fg">
                      {p.label}
                    </span>
                    <span className="shrink-0 font-mono text-[9.5px] text-fg-mute">
                      {done ? "in file" : `+${missing}`}
                    </span>
                  </span>
                  <span className="mt-1 block text-[10.5px] leading-snug text-fg-mute">
                    {p.blurb}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {p.tokens.slice(0, 4).map((t) => (
                      <span
                        key={t.name}
                        className="rounded border border-line px-1 py-px font-mono text-[9px] text-fg-mute"
                      >
                        {t.name}
                      </span>
                    ))}
                    {p.tokens.length > 4 ? (
                      <span className="px-0.5 font-mono text-[9px] text-fg-mute">
                        +{p.tokens.length - 4}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

