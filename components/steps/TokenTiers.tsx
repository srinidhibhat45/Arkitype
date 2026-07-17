"use client";

/**
 * Unified token tiers — the semantic + component halves of the one colour
 * surface (primitives live in ColourStep's ramps above them). Everything is
 * edited inline, in place: no dropdown, no modal. Each token row carries an
 * editable name (rename propagates through refs + bindings), and per mode a
 * colour well, a free-text value (a ramp ref like `brand-600`, an `@role`
 * reference, or a raw hex), and an alpha slider. A token's value can point at a
 * primitive step, a literal hex, or — for component tokens — another role via
 * `@role`, so the whole system stays one continuous editable chain.
 */
import { useEffect, useState } from "react";
import { PreviewMode, SemanticGroup, useDesignSystem } from "@/store/useDesignSystem";
import { resolveTokenValue, alphaOfValue, applyAlphaToValue } from "@/lib/tokens";
import { isValidHex, stripAlpha, withAlpha } from "@/lib/color";
import { CanvasSection } from "@/components/ui/controls";
import { Check, Plus, Trash2 } from "lucide-react";

/* ── one mode's value: colour well + free-text ref/hex + alpha ── */

function ModeValueEditor({ mode, token }: { mode: PreviewMode; token: string }) {
  const primitives = useDesignSystem((s) => s.primitives);
  const semantics = useDesignSystem((s) => s.semantics);
  const setSemantic = useDesignSystem((s) => s.setSemantic);

  const value = semantics.modes[mode][token] ?? "";
  const resolved = resolveTokenValue({ primitives, semantics }, mode, value);
  const alpha = alphaOfValue(value);
  const isRawHex = value.trim().startsWith("#");
  const badHex = isRawHex && !isValidHex(value.trim());

  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const t = draft.trim();
    if (t !== value) setSemantic(mode, token, t);
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* colour well — checkerboard shows through translucent tokens */}
      <label
        className="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-md border border-line-strong"
        style={{
          backgroundImage:
            "linear-gradient(45deg,#8883 25%,transparent 25%,transparent 75%,#8883 75%),linear-gradient(45deg,#8883 25%,transparent 25%,transparent 75%,#8883 75%)",
          backgroundSize: "8px 8px",
          backgroundPosition: "0 0,4px 4px",
        }}
        title={`${resolved} — click to pick a raw colour`}
      >
        <span className="absolute inset-0" style={{ background: resolved }} />
        <input
          type="color"
          aria-label={`${token} ${mode} colour`}
          value={isValidHex(resolved) ? stripAlpha(resolved) : "#000000"}
          onChange={(e) => setSemantic(mode, token, withAlpha(e.target.value, alpha))}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>

      {/* free-text value: ramp ref, @role, or hex */}
      <input
        type="text"
        spellCheck={false}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setDraft(value);
        }}
        aria-invalid={badHex}
        className={`h-7 w-full min-w-0 rounded-md border bg-ink-panel px-2 font-mono text-[11px] transition-colors focus:outline-none ${
          badHex
            ? "border-red-500/50 text-red-400"
            : "border-line text-fg-dim focus:border-line-strong focus:text-fg"
        }`}
      />

      {/* alpha */}
      <div className="flex shrink-0 items-center gap-1" title="Opacity">
        <input
          type="range"
          min={0}
          max={100}
          value={alpha}
          aria-label={`${token} ${mode} opacity`}
          onChange={(e) => setSemantic(mode, token, applyAlphaToValue(value, Number(e.target.value)))}
          className="h-1 w-12 cursor-pointer accent-fg"
        />
        <span className="w-7 text-right font-mono text-[10px] tabular-nums text-fg-mute">
          {alpha}%
        </span>
      </div>
    </div>
  );
}

/* ── inline-editable token name (rename) ── */

function TokenName({ token }: { token: string }) {
  const renameRole = useDesignSystem((s) => s.renameRole);
  const [draft, setDraft] = useState(token);
  useEffect(() => setDraft(token), [token]);

  const commit = () => {
    if (draft.trim() && draft.trim() !== token) renameRole(token, draft);
    else setDraft(token);
  };

  return (
    <input
      type="text"
      spellCheck={false}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(token);
      }}
      aria-label={`Rename ${token}`}
      title="Rename this token — references and component bindings follow"
      className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 font-mono text-[11px] leading-snug text-fg-dim transition-colors hover:border-line focus:border-line-strong focus:text-fg focus:outline-none"
    />
  );
}

/* ── add a token to a group ── */

function AddTokenRow({ groupLabel }: { groupLabel: string }) {
  const addRole = useDesignSystem((s) => s.addRole);
  const [text, setText] = useState("");
  const commit = () => {
    const v = text.trim();
    if (v) {
      addRole(groupLabel, v);
      setText("");
    }
  };
  return (
    <div className="flex items-center gap-2 px-5 py-2">
      <input
        type="text"
        value={text}
        placeholder="add token to this group…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        className="h-7 min-w-0 flex-1 rounded-md border border-line bg-ink-panel px-2 text-[11px] text-fg placeholder:text-fg-mute focus:border-line-strong focus:outline-none"
      />
      <button
        type="button"
        onClick={commit}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
      >
        <Plus size={11} />
        Add
      </button>
    </div>
  );
}

/* ── one group of tokens ── */

function TokenGroup({ group }: { group: SemanticGroup }) {
  const removeRole = useDesignSystem((s) => s.removeRole);
  const renameGroup = useDesignSystem((s) => s.renameGroup);
  const removeGroup = useDesignSystem((s) => s.removeGroup);
  const [label, setLabel] = useState(group.label);
  useEffect(() => setLabel(group.label), [group.label]);

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-line bg-ink-panel/50 px-5 py-1.5">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => {
            if (label.trim() && label.trim() !== group.label) renameGroup(group.label, label);
            else setLabel(group.label);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setLabel(group.label);
          }}
          aria-label={`Rename group ${group.label}`}
          className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-mute transition-colors hover:border-line focus:border-line-strong focus:text-fg-dim focus:outline-none"
        />
        <button
          type="button"
          title="Remove group and its tokens"
          onClick={() => removeGroup(group.label)}
          className="shrink-0 rounded p-0.5 text-fg-mute opacity-0 transition-opacity hover:text-red-400 group-hover/tier:opacity-100"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {group.tokens.map((token) => (
        <div
          key={token}
          id={`role-${token}`}
          className="group/row grid grid-cols-[minmax(120px,160px)_1fr_1fr] items-center gap-x-3 border-b border-line px-5 py-2 last:border-b-0 transition-colors hover:bg-ink-panel/40"
        >
          <div className="flex min-w-0 items-center gap-1">
            <TokenName token={token} />
            <button
              type="button"
              title="Remove token"
              onClick={() => removeRole(token)}
              className="shrink-0 rounded p-0.5 text-fg-mute opacity-0 transition-opacity hover:text-red-400 group-hover/row:opacity-100"
            >
              <Trash2 size={11} />
            </button>
          </div>
          <ModeValueEditor mode="light" token={token} />
          <ModeValueEditor mode="dark" token={token} />
        </div>
      ))}

      <AddTokenRow groupLabel={group.label} />
    </div>
  );
}

/* ── a whole tier (semantic or component) ── */

export function TokenTier({ kind }: { kind: "semantic" | "component" }) {
  const groups = useDesignSystem((s) => s.semantics.groups);
  const addGroup = useDesignSystem((s) => s.addGroup);
  const [newGroup, setNewGroup] = useState("");

  const tierGroups = groups.filter((g) =>
    kind === "component" ? g.kind === "component" : g.kind !== "component"
  );

  const title = kind === "component" ? "Component tokens" : "Semantic roles";
  const hint =
    kind === "component"
      ? "component-level colours — bind to a role via @role, a ramp step, or a hex · light · dark"
      : "meaning mapped onto primitives · light · dark · bind a ramp step, @role, or hex";

  const commitGroup = () => {
    const v = newGroup.trim();
    if (v) {
      addGroup(v, kind);
      setNewGroup("");
    }
  };

  return (
    <CanvasSection title={title} hint={hint}>
      <div className="group/tier overflow-hidden rounded-xl border border-line">
        <div className="grid grid-cols-[minmax(120px,160px)_1fr_1fr] gap-x-3 border-b border-line bg-ink-panel px-5 py-2.5">
          <span className="text-[11px] font-medium text-fg-mute">
            {kind === "component" ? "Component token" : "Role"}
          </span>
          <span className="text-[11px] font-medium text-fg-mute">Light</span>
          <span className="text-[11px] font-medium text-fg-mute">Dark</span>
        </div>

        {tierGroups.map((group) => (
          <TokenGroup key={group.label} group={group} />
        ))}

        <div className="flex items-center gap-2 border-t border-line px-5 py-2.5">
          <input
            type="text"
            value={newGroup}
            placeholder={kind === "component" ? "e.g. Table" : "e.g. Chart"}
            onChange={(e) => setNewGroup(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitGroup();
            }}
            className="h-7 min-w-0 flex-1 rounded-md border border-line bg-ink-panel px-2 text-[11px] text-fg placeholder:text-fg-mute focus:border-line-strong focus:outline-none"
          />
          <button
            type="button"
            onClick={commitGroup}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
          >
            <Plus size={11} />
            Add group
          </button>
        </div>
      </div>

      {tierGroups.length === 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-fg-mute">
          <Check size={12} /> No {kind === "component" ? "component tokens" : "roles"} yet — add a
          group to start.
        </p>
      )}
    </CanvasSection>
  );
}
