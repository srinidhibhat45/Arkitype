"use client";

import { useState, useEffect } from "react";
import { Check, Plus, Trash2, Copy, Layers, Database } from "lucide-react";
import { rampStepLabels } from "@/lib/color";
import { COMPONENT_LANES } from "@/lib/componentLanes";
import {
  STEP_META,
  STEP_ORDER,
  useDesignSystem,
  BASE_RADII,
  RADII_NAMES,
  StepId,
} from "@/store/useDesignSystem";
import { generateTypeScale, STEP_DEFS } from "@/lib/typography";

export function StageRail() {
  const [width, setWidth] = useState(260);

  useEffect(() => {
    const saved = localStorage.getItem("arkitype-stage-rail-width");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 200 && parsed <= 450) {
        setWidth(parsed);
      }
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      if (newWidth >= 200 && newWidth <= 450) {
        setWidth(newWidth);
        localStorage.setItem("arkitype-stage-rail-width", String(newWidth));
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const activeStep = useDesignSystem((s) => s.journey.activeStep);
  const done = useDesignSystem((s) => s.journey.done);
  const visited = useDesignSystem((s) => s.journey.visited ?? {});
  const goToStep = useDesignSystem((s) => s.goToStep);

  const primitives = useDesignSystem((s) => s.primitives);
  const components = useDesignSystem((s) => s.components);
  const activeLeftTab = useDesignSystem((s) => s.activeLeftTab);
  const setActiveLeftTab = useDesignSystem((s) => s.setActiveLeftTab);
  const activeComponentId = useDesignSystem((s) => s.activeComponentId);
  const setActiveComponentId = useDesignSystem((s) => s.setActiveComponentId);
  const spacingBase = useDesignSystem((s) => s.primitives.spacingBase);
  const setSpacingBase = useDesignSystem((s) => s.setSpacingBase);

  // Store Actions
  const addFamily = useDesignSystem((s) => s.addFamily);
  const removeFamily = useDesignSystem((s) => s.removeFamily);
  const addSpacingStep = useDesignSystem((s) => s.addSpacingStep);
  const removeSpacingStep = useDesignSystem((s) => s.removeSpacingStep);
  const addRadiusStep = useDesignSystem((s) => s.addRadiusStep);
  const removeRadiusStep = useDesignSystem((s) => s.removeRadiusStep);
  const addFontRole = useDesignSystem((s) => s.addFontRole);
  const removeFontRole = useDesignSystem((s) => s.removeFontRole);
  const addTypeStep = useDesignSystem((s) => s.addTypeStep);
  const removeTypeStep = useDesignSystem((s) => s.removeTypeStep);

  // Copy state feedback
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Inline forms toggles
  const [addingRadius, setAddingRadius] = useState(false);
  const [radName, setRadName] = useState("");
  const [radValue, setRadValue] = useState(8);

  const [addingFont, setAddingFont] = useState(false);
  const [fontRole, setFontRole] = useState("");
  const [fontFamily, setFontFamilyName] = useState("Inter, sans-serif");

  const [addingScaleStep, setAddingScaleStep] = useState(false);
  const [scaleName, setScaleName] = useState("");
  const [scaleExp, setScaleExp] = useState(6);
  const [scaleAssign, setScaleAssign] = useState("H1 Display Extra");

  const doneCount = STEP_ORDER.filter((id) => done[id]).length;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => {
      setCopiedText(null);
    }, 1500);
  };

  const handleAddRadius = (e: React.FormEvent) => {
    e.preventDefault();
    if (!radName) return;
    addRadiusStep(radName, Number(radValue));
    setRadName("");
    setAddingRadius(false);
  };

  const handleAddFont = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fontRole || !fontFamily) return;
    addFontRole(fontRole, fontFamily);
    setFontRole("");
    setAddingFont(false);
  };

  const handleAddScaleStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scaleName) return;
    addTypeStep(scaleName, scaleAssign, Number(scaleExp));
    setScaleName("");
    setAddingScaleStep(false);
  };

  return (
    <nav
      style={{ width: `${width}px` }}
      className="relative flex shrink-0 flex-col border-r border-line bg-ink select-none"
    >
      {/* Top Figma Tab Switcher */}
      <div className="flex h-9 shrink-0 items-center border-b border-line px-3.5 bg-ink">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveLeftTab("layers")}
            className={`flex items-center gap-1.5 px-2 py-1 text-[12px] font-bold tracking-wide transition-colors rounded ${
              activeLeftTab === "layers" ? "text-fg bg-ink-hover" : "text-fg-mute hover:text-fg-dim"
            }`}
          >
            <Layers size={11} />
            Layers
          </button>
          <button
            type="button"
            id="stage-rail-tokens-tab"
            onClick={() => setActiveLeftTab("tokens")}
            className={`flex items-center gap-1.5 px-2 py-1 text-[12px] font-bold tracking-wide transition-colors rounded ${
              activeLeftTab === "tokens" ? "text-fg bg-ink-hover" : "text-fg-mute hover:text-fg-dim"
            }`}
          >
            <Database size={11} />
            Tokens
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeLeftTab === "layers" ? (
          /* Layers View (original step stages & components hierarchical tree) */
          <div className="px-3 py-4">
            <p className="px-3 pb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-mute">
              Document layers
            </p>
            <div className="space-y-1">
              {STEP_ORDER.map((id) => {
                const m = STEP_META[id];
                const active = activeStep === id;
                const isDone = !!done[id];
                const isVisited = !!visited[id];
                const isComponentsStep = id === "components";

                return (
                  <div key={id} className="flex flex-col">
                    <button
                      type="button"
                      title={m.blurb}
                      onClick={() => goToStep(id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left transition-colors ${
                        active ? "bg-ink-raised" : "hover:bg-ink-panel"
                      }`}
                    >
                      <span className={`w-5 shrink-0 font-mono text-[11.5px] ${active ? "text-fg" : "text-fg-mute"}`}>
                        {m.n}
                      </span>
                      <span
                        className={`flex-1 text-[13.5px] ${
                          active
                            ? "font-medium text-fg"
                            : isDone || isVisited
                              ? "text-fg-dim"
                              : "text-fg-mute"
                        }`}
                      >
                        {m.label}
                      </span>
                      {isDone ? (
                        <Check size={12} className="shrink-0 text-fg-dim" />
                      ) : active ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-fg" />
                      ) : isVisited ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-fg-mute" />
                      ) : null}
                    </button>

                    {/* Hierarchical sub-tree list of component layers grouped by Lane */}
                    {isComponentsStep && (activeStep === "components" || activeStep === "ship" || activeStep === "preview") && (
                      <div className="mt-1.5 border-l border-line ml-[21px] pl-3.5 space-y-3 py-1">
                        {COMPONENT_LANES.map((lane) => (
                          <div key={lane.label} className="space-y-1">
                            <span className="block px-2 text-[9px] font-bold uppercase tracking-[0.08em] text-fg-mute">
                              {lane.label}
                            </span>
                            <div className="space-y-0.5 border-l border-line/30 ml-2 pl-2">
                              {lane.items.map((item) => {
                                const compActive = activeComponentId === item.id && activeStep === "components";
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                      goToStep("components");
                                      setActiveComponentId(item.id);
                                    }}
                                    className={`flex w-full items-center gap-1.5 rounded px-2 py-0.5 text-left text-[12px] transition-colors ${
                                      compActive ? "bg-ink-raised text-fg font-semibold" : "text-fg-mute hover:text-fg hover:bg-ink-panel"
                                    }`}
                                  >
                                    <span className="opacity-40 font-mono text-[9px]">◇</span>
                                    <span className="truncate">{item.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Tokens Studio View (defined primitives & semantics) */
          <div className="px-4 py-4 space-y-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-mute mb-3">
                Primitives & Semantics
              </p>
              {/* Density Switcher */}
              <div className="mb-2 rounded-lg bg-ink-panel p-2 border border-line">
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-fg-mute block mb-1.5">
                  Density Mode (Spacing Base)
                </span>
                <div className="grid grid-cols-3 gap-1 bg-ink border border-line rounded p-0.5">
                  {(["compact", "comfortable", "loose"] as const).map((d) => {
                    const isSelected = 
                      d === "compact" ? spacingBase === 3 :
                      d === "comfortable" ? spacingBase === 4 :
                      spacingBase === 6;
                    const label = d.charAt(0).toUpperCase() + d.slice(1);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          if (d === "compact") setSpacingBase(3);
                          else if (d === "comfortable") setSpacingBase(4);
                          else setSpacingBase(6);
                        }}
                        className={`rounded py-1 text-[10px] font-bold capitalize transition-colors ${
                          isSelected ? "bg-fg text-ink" : "text-fg-mute hover:text-fg-dim"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Colors Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-line pb-1.5">
                <span className="text-[12px] font-bold text-fg">Colors</span>
                <button
                  type="button"
                  onClick={() => addFamily()}
                  className="rounded p-0.5 hover:bg-ink-hover text-fg-mute hover:text-fg transition-colors"
                  title="Add Color Family"
                >
                  <Plus size={12} />
                </button>
              </div>

              <div className="space-y-3 pt-1">
                {primitives.colorFamilies.map((fam) => {
                  const labels = rampStepLabels(fam.steps);
                  return (
                    <div key={fam.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: fam.seed }}
                          />
                          <span className="text-[12px] font-medium text-fg-dim capitalize">{fam.name}</span>
                        </div>
                        {primitives.colorFamilies.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFamily(fam.id)}
                            className="text-fg-mute hover:text-red-500 rounded p-0.5 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>

                      {/* shades */}
                      <div className="grid grid-cols-2 gap-1 pl-3.5">
                        {labels.map((step: number, index: number) => {
                          const ramp = primitives.colors[fam.id] ?? [];
                          const refName = `{colors.${fam.id}-${step}}`;
                          const value = ramp[index] || "#ffffff";
                          const isCopied = copiedText === refName;

                          return (
                            <button
                              key={step}
                              type="button"
                              onClick={() => handleCopy(refName)}
                              className="group flex items-center gap-1.5 rounded p-0.5 hover:bg-ink-panel text-left transition-colors border border-transparent hover:border-line"
                              title={`Click to copy: ${refName}`}
                            >
                              <span
                                className="h-3 w-3 shrink-0 rounded border border-line"
                                style={{ backgroundColor: value }}
                              />
                              <div className="min-w-0 flex-1 flex flex-col">
                                <span className="text-[10.5px] font-mono text-fg leading-none">{step}</span>
                                <span className="text-[9px] font-mono text-fg-mute leading-none mt-0.5 truncate">{value}</span>
                              </div>
                              <span className="opacity-0 group-hover:opacity-100 text-[8px] text-fg-mute mr-0.5">
                                {isCopied ? <Check size={8} /> : <Copy size={8} />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Spacing Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-line pb-1.5">
                <span className="text-[12px] font-bold text-fg">Spacing</span>
                <button
                  type="button"
                  onClick={() => addSpacingStep()}
                  className="rounded p-0.5 hover:bg-ink-hover text-fg-mute hover:text-fg transition-colors"
                  title="Add Spacing Step"
                >
                  <Plus size={12} />
                </button>
              </div>

              <div className="space-y-1 pt-1 pl-1">
                {primitives.spacing.map((px, i) => {
                  const stepIndex = i + 1;
                  const refName = `{spacing.${stepIndex}}`;
                  const isCopied = copiedText === refName;

                  return (
                    <div
                      key={i}
                      className="group flex items-center justify-between rounded px-1.5 py-0.5 hover:bg-ink-panel border border-transparent hover:border-line"
                    >
                      <button
                        type="button"
                        onClick={() => handleCopy(refName)}
                        className="flex-1 flex items-center justify-between text-left min-w-0"
                        title={`Click to copy: ${refName}`}
                      >
                        <span className="text-[12px] font-mono text-fg-dim">space-{stepIndex}</span>
                        <span className="text-[11px] font-mono text-fg-mute mr-2">{px}px</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(refName)}
                          className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-fg transition-opacity"
                        >
                          {isCopied ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                        {primitives.spacingMultipliers.length > 8 && i >= 8 && (
                          <button
                            type="button"
                            onClick={() => removeSpacingStep(i)}
                            className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-red-500 transition-opacity"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Radius Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-line pb-1.5">
                <span className="text-[12px] font-bold text-fg">Radius</span>
                <button
                  type="button"
                  onClick={() => setAddingRadius(!addingRadius)}
                  className="rounded p-0.5 hover:bg-ink-hover text-fg-mute hover:text-fg transition-colors"
                  title="Add Radius Token"
                >
                  <Plus size={12} />
                </button>
              </div>

              {addingRadius && (
                <form onSubmit={handleAddRadius} className="bg-ink-panel border border-line rounded p-2 space-y-2">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Name (e.g. 3xl)"
                      value={radName}
                      onChange={(e) => setRadName(e.target.value)}
                      className="w-0 flex-1 bg-ink border border-line text-[11.5px] px-1.5 py-0.5 rounded text-fg"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Value (px)"
                      value={radValue}
                      onChange={(e) => setRadValue(Number(e.target.value))}
                      className="w-16 bg-ink border border-line text-[11.5px] px-1.5 py-0.5 rounded text-fg"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAddingRadius(false)}
                      className="text-[10px] px-1.5 py-0.5 rounded text-fg-mute hover:bg-ink hover:text-fg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-[10px] px-2 py-0.5 rounded bg-fg text-ink font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-1 pt-1 pl-1">
                {(primitives.radiusNames ?? RADII_NAMES).map((name, i) => {
                  const px = primitives.radii[i] ?? 0;
                  const refName = `{radius.${name}}`;
                  const isCopied = copiedText === refName;

                  return (
                    <div
                      key={i}
                      className="group flex items-center justify-between rounded px-1.5 py-0.5 hover:bg-ink-panel border border-transparent hover:border-line"
                    >
                      <button
                        type="button"
                        onClick={() => handleCopy(refName)}
                        className="flex-1 flex items-center justify-between text-left min-w-0"
                        title={`Click to copy: ${refName}`}
                      >
                        <span className="text-[12px] font-mono text-fg-dim">{name}</span>
                        <span className="text-[11px] font-mono text-fg-mute mr-2">{px}px</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(refName)}
                          className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-fg transition-opacity"
                        >
                          {isCopied ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                        {name !== "none" && name !== "full" && (
                          <button
                            type="button"
                            onClick={() => removeRadiusStep(i)}
                            className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-red-500 transition-opacity"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Typography Families Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-line pb-1.5">
                <span className="text-[12px] font-bold text-fg">Font Families</span>
                <button
                  type="button"
                  onClick={() => setAddingFont(!addingFont)}
                  className="rounded p-0.5 hover:bg-ink-hover text-fg-mute hover:text-fg transition-colors"
                  title="Add Font Role"
                >
                  <Plus size={12} />
                </button>
              </div>

              {addingFont && (
                <form onSubmit={handleAddFont} className="bg-ink-panel border border-line rounded p-2 space-y-2">
                  <input
                    type="text"
                    placeholder="Role (e.g. quote)"
                    value={fontRole}
                    onChange={(e) => setFontRole(e.target.value)}
                    className="w-full bg-ink border border-line text-[11.5px] px-1.5 py-0.5 rounded text-fg"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Family family name"
                    value={fontFamily}
                    onChange={(e) => setFontFamilyName(e.target.value)}
                    className="w-full bg-ink border border-line text-[11.5px] px-1.5 py-0.5 rounded text-fg"
                    required
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAddingFont(false)}
                      className="text-[10px] px-1.5 py-0.5 rounded text-fg-mute hover:bg-ink hover:text-fg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-[10px] px-2 py-0.5 rounded bg-fg text-ink font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-1.5 pt-1 pl-1">
                {Object.entries(primitives.typography.fontRoles).map(([role, r]) => {
                  const refName = `{fonts.${role}}`;
                  const isCopied = copiedText === refName;

                  return (
                    <div
                      key={role}
                      className="group flex flex-col gap-0.5 rounded px-1.5 py-1 hover:bg-ink-panel border border-transparent hover:border-line"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleCopy(refName)}
                          className="text-[12px] font-bold text-fg-dim capitalize"
                          title={`Click to copy: ${refName}`}
                        >
                          {role}
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(refName)}
                            className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-fg transition-opacity"
                          >
                            {isCopied ? <Check size={10} /> : <Copy size={10} />}
                          </button>
                          {role !== "body" && role !== "mono" && role !== "heading" && role !== "display" && (
                            <button
                              type="button"
                              onClick={() => removeFontRole(role)}
                              className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-red-500 transition-opacity"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-fg-mute truncate">{r.family}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Typography Scale Steps Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-line pb-1.5">
                <span className="text-[12px] font-bold text-fg">Font Scale Steps</span>
                <button
                  type="button"
                  onClick={() => setAddingScaleStep(!addingScaleStep)}
                  className="rounded p-0.5 hover:bg-ink-hover text-fg-mute hover:text-fg transition-colors"
                  title="Add Font Scale Step"
                >
                  <Plus size={12} />
                </button>
              </div>

              {addingScaleStep && (
                <form onSubmit={handleAddScaleStep} className="bg-ink-panel border border-line rounded p-2 space-y-2">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Name (e.g. 5xl)"
                      value={scaleName}
                      onChange={(e) => setScaleName(e.target.value)}
                      className="w-0 flex-1 bg-ink border border-line text-[11.5px] px-1.5 py-0.5 rounded text-fg"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Exp (e.g. 6)"
                      value={scaleExp}
                      onChange={(e) => setScaleExp(Number(e.target.value))}
                      className="w-16 bg-ink border border-line text-[11.5px] px-1.5 py-0.5 rounded text-fg"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Assignment (e.g. Hero)"
                    value={scaleAssign}
                    onChange={(e) => setScaleAssign(e.target.value)}
                    className="w-full bg-ink border border-line text-[11.5px] px-1.5 py-0.5 rounded text-fg"
                    required
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAddingScaleStep(false)}
                      className="text-[10px] px-1.5 py-0.5 rounded text-fg-mute hover:bg-ink hover:text-fg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-[10px] px-2 py-0.5 rounded bg-fg text-ink font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-1 pt-1 pl-1">
                {generateTypeScale(
                  primitives.typography.baseSize,
                  primitives.typography.scaleFactor,
                  {
                    rounding: primitives.typography.rounding,
                    sizeOverrides: primitives.typography.sizeOverrides,
                  },
                  primitives.typography.stepDefs ?? STEP_DEFS
                ).map((s) => {
                  const refSize = `{fontSize.${s.name}}`;
                  const isCopied = copiedText === refSize;

                  return (
                    <div
                      key={s.name}
                      className="group flex items-center justify-between rounded px-1.5 py-0.5 hover:bg-ink-panel border border-transparent hover:border-line"
                    >
                      <button
                        type="button"
                        onClick={() => handleCopy(refSize)}
                        className="flex-1 flex items-center justify-between text-left min-w-0"
                        title={`Click to copy: ${refSize}`}
                      >
                        <span className="text-[12px] font-mono text-fg-dim">{s.name}</span>
                        <span className="text-[11px] font-mono text-fg-mute mr-2">{s.size}px</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(refSize)}
                          className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-fg transition-opacity"
                        >
                          {isCopied ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                        {!["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"].includes(s.name) && (
                          <button
                            type="button"
                            onClick={() => removeTypeStep(s.name)}
                            className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-red-500 transition-opacity"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Elevation Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-line pb-1.5">
                <span className="text-[12px] font-bold text-fg">Elevation (Shadows)</span>
              </div>
              <div className="space-y-1 pt-1 pl-1">
                {primitives.elevation.light.map((level, i) => {
                  const refName = `{shadows.${level.name}}`;
                  const isCopied = copiedText === refName;

                  return (
                    <div
                      key={level.name}
                      className="group flex items-center justify-between rounded px-1.5 py-0.5 hover:bg-ink-panel border border-transparent hover:border-line"
                    >
                      <button
                        type="button"
                        onClick={() => handleCopy(refName)}
                        className="flex-1 flex items-center justify-between text-left min-w-0"
                        title={`Click to copy: ${refName}`}
                      >
                        <span className="text-[12px] font-mono text-fg-dim truncate">{level.name}</span>
                        <span className="text-[11px] font-mono text-fg-mute mr-2 truncate">y: {level.y}px</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(refName)}
                        className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-fg transition-opacity"
                      >
                        {isCopied ? <Check size={10} /> : <Copy size={10} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Motion Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-line pb-1.5">
                <span className="text-[12px] font-bold text-fg">Motion</span>
              </div>
              <div className="space-y-2 pt-1 pl-1">
                <div>
                  <span className="text-[10px] font-bold text-fg-mute uppercase tracking-wide">Durations</span>
                  {Object.entries(primitives.motion.durations).map(([name, ms]) => {
                    const refName = `{motion.duration-${name}}`;
                    const isCopied = copiedText === refName;
                    return (
                      <div
                        key={name}
                        className="group flex items-center justify-between rounded px-1.5 py-0.5 hover:bg-ink-panel border border-transparent hover:border-line"
                      >
                        <button
                          type="button"
                          onClick={() => handleCopy(refName)}
                          className="flex-1 flex items-center justify-between text-left min-w-0"
                          title={`Click to copy: ${refName}`}
                        >
                          <span className="text-[12px] font-mono text-fg-dim">{name}</span>
                          <span className="text-[11px] font-mono text-fg-mute mr-2">{ms}ms</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(refName)}
                          className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-fg transition-opacity"
                        >
                          {isCopied ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-fg-mute uppercase tracking-wide">Easings</span>
                  {primitives.motion.easings.map((ease) => {
                    const refName = `{motion.ease-${ease.name}}`;
                    const isCopied = copiedText === refName;
                    return (
                      <div
                        key={ease.name}
                        className="group flex items-center justify-between rounded px-1.5 py-0.5 hover:bg-ink-panel border border-transparent hover:border-line"
                      >
                        <button
                          type="button"
                          onClick={() => handleCopy(refName)}
                          className="flex-1 flex items-center justify-between text-left min-w-0"
                          title={`Click to copy: ${refName}`}
                        >
                          <span className="text-[12px] font-mono text-fg-dim truncate">{ease.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(refName)}
                          className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-fg transition-opacity shrink-0"
                        >
                          {isCopied ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Footer (only visible when in Layers tab) */}
      {activeLeftTab === "layers" && (
        <div className="border-t border-line px-6 py-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[11px] text-fg-mute">Progress</span>
            <span className="font-mono text-[11px] text-fg-dim">
              {doneCount} / {STEP_ORDER.length}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-fg transition-all duration-300"
              style={{ width: `${(doneCount / STEP_ORDER.length) * 100}%` }}
            />
          </div>
        </div>
      )}
      {/* Resizer Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 bottom-0 right-0 w-1 cursor-col-resize hover:bg-line-strong/50 active:bg-focus transition-colors z-30"
        style={{ transform: "translateX(50%)" }}
      />
    </nav>
  );
}
