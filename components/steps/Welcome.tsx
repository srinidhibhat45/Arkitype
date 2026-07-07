"use client";

/**
 * The starting moment. One decision — a name and a brand colour — and the
 * system begins. Framer lesson: never open onto an empty configuration dump;
 * open onto momentum.
 */
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Field, HexInput } from "@/components/ui/controls";
import { isValidHex } from "@/lib/color";
import { STEP_META, STEP_ORDER, useDesignSystem } from "@/store/useDesignSystem";

export function Welcome() {
  const startSystem = useDesignSystem((s) => s.startSystem);
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#4f46e5");

  const start = () => startSystem(name, isValidHex(hex) ? hex : "#4f46e5");

  return (
    <div className="flex h-screen flex-col overflow-y-auto bg-ink">
      <div className="flex items-center gap-3 px-8 py-6">
        <div className="h-4 w-4 rounded-[5px] bg-fg" aria-hidden />
        <span className="text-[13px] font-semibold tracking-tight text-fg">
          Arkitype
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-fg-mute">
            Design-system builder
          </p>
          <h1 className="mt-3 text-[34px] font-semibold leading-[1.15] tracking-tight text-fg">
            Build the system
            <br />
            before the screens.
          </h1>
          <p className="mt-4 text-[14px] leading-relaxed text-fg-dim">
            Six ordered steps, from a single brand colour to a shipped Figma
            bundle. Each decision feeds the next — colour and roles before
            components, components before proof.
          </p>

          <div className="mt-9">
            <Field label="Name your system">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") start();
                }}
                placeholder="e.g. Meridian, Northwind, Cobalt"
                autoFocus
                className="h-10 w-full rounded-lg border border-line bg-ink-panel px-3 text-[14px] text-fg placeholder:text-fg-mute focus:border-line-strong focus:outline-none"
              />
            </Field>

            <Field label="Brand colour" hint="everything descends from this">
              <HexInput value={hex} onChange={setHex} />
              <p className="mt-2 text-[11px] leading-relaxed text-fg-mute">
                Paste your brand's hex or use the picker. Complementary and
                supporting colours will be suggested from it in step 01 — never
                imposed.
              </p>
            </Field>

            <button
              type="button"
              onClick={start}
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-fg text-[14px] font-medium text-ink transition hover:opacity-90"
            >
              Start building
              <ArrowRight size={15} />
            </button>

            <p className="mt-4 text-center text-[11px] text-fg-mute">
              Autosaves to this browser. No account needed.
            </p>
          </div>

          <div className="mt-12 border-t border-line pt-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {STEP_ORDER.map((id) => (
                <div key={id} className="flex items-baseline gap-2.5">
                  <span className="font-mono text-[10px] text-fg-mute">
                    {STEP_META[id].n}
                  </span>
                  <span className="text-[12px] text-fg-dim">
                    {STEP_META[id].label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
