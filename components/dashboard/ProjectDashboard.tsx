"use client";

import {
  Density,
  EngineeringDestination,
  FRAMEWORK_TWINS,
  InitConfig,
  ProjectState,
  StartingPoint,
  TargetPlatform,
  useDesignSystem,
  PROJECT_LIMIT,
} from "@/store/useDesignSystem";
import { HexInput } from "@/components/ui/controls";
import { BetaTag } from "@/components/ui/BetaTag";
import { matchGoogleFont } from "@/lib/googleFonts";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Copy,
  FileStack,
  Folder,
  FolderInput,
  Globe,
  Layers,
  LogOut,
  Loader2,
  Moon,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";

const UNFILED = "__unfiled__";

/** Text input with a self-rendered dropdown over existing folder names — the
 *  one control that both creates and assigns clients, so there's no separate
 *  "manage folders" surface: a folder exists the moment a project carries its
 *  name. A native <datalist> looked the part but rendered as an unstyled,
 *  browser-default popup that's easy to miss (or that never shows at all in
 *  some embedded contexts) — this draws its own list so picking or creating a
 *  client is always visible. */
function FolderField({
  id,
  value,
  onChange,
  folderNames,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  folderNames: string[];
}) {
  const [open, setOpen] = useState(false);
  const trimmed = value.trim();
  const matches = folderNames.filter((f) => f.toLowerCase().includes(trimmed.toLowerCase()));
  const exactMatch = folderNames.some((f) => f.toLowerCase() === trimmed.toLowerCase());
  const showCreate = trimmed.length > 0 && !exactMatch;
  const showPanel = open && (matches.length > 0 || showCreate || folderNames.length === 0);

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape" || e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder="No client"
        autoComplete="off"
        className="h-10 w-full rounded-lg border border-line-strong bg-ink px-3 text-sm text-fg placeholder:text-fg-mute focus:border-fg focus:outline-none"
      />
      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-48 overflow-y-auto rounded-lg border border-line-strong bg-ink-raised py-1 shadow-lg">
          {matches.map((f) => (
            <button
              key={f}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(f);
              }}
              className="block w-full truncate px-3 py-2 text-left text-sm text-fg hover:bg-ink-hover"
            >
              {f}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(trimmed);
              }}
              className={`flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm text-fg-dim hover:bg-ink-hover ${
                matches.length > 0 ? "border-t border-line" : ""
              }`}
            >
              <Plus size={12} /> Create client &ldquo;{trimmed}&rdquo;
            </button>
          )}
          {matches.length === 0 && !showCreate && folderNames.length === 0 && (
            <p className="px-3 py-2 text-[12px] text-fg-mute">
              No clients yet — type a name to create one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Generic segmented pill row — density, platform, engineering destination all use it. */
function PillGroup<T extends string>({
  value,
  onChange,
  options,
  cols = 3,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  cols?: number;
}) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg border px-2 py-2 text-[13px] font-medium transition-colors ${
            value === o.value
              ? "border-fg bg-fg text-ink"
              : "border-line-strong text-fg-dim hover:bg-ink-hover"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StartCard({
  icon,
  label,
  blurb,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  blurb: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
        selected ? "border-fg bg-ink-hover" : "border-line-strong hover:bg-ink-hover"
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${selected ? "text-fg" : "text-fg-mute"}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-fg">{label}</span>
        <span className="block text-[11px] leading-snug text-fg-mute">{blurb}</span>
      </span>
    </button>
  );
}

const PLATFORM_OPTIONS: { value: TargetPlatform; label: string }[] = [
  { value: "web", label: "Web" },
  { value: "mobile", label: "Mobile" },
  { value: "cross", label: "Cross-platform" },
];
const DESTINATION_OPTIONS: { value: EngineeringDestination; label: string }[] = [
  { value: "tailwind", label: "Tailwind" },
  { value: "mui", label: "MUI" },
  { value: "css", label: "CSS vars" },
  { value: "swiftui", label: "SwiftUI" },
];
const DENSITY_OPTIONS: { value: Density; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "standard", label: "Standard" },
  { value: "spacious", label: "Spacious" },
];

/**
 * Two-step init wizard (MAJOR_OVERHAUL_PLAN.md Phase 2). Step 1 answers the
 * infrastructure question ("how do you start?"); step 2 names the file and sets
 * the handoff targets. Welcome.tsx used to own the creative "name + brand" moment
 * but is dead code for dashboard-created files, so that lives here now too.
 */
function NewFileWizard({
  defaultName,
  folderNames,
  onClose,
  onCreate,
}: {
  defaultName: string;
  folderNames: string[];
  onClose: () => void;
  onCreate: (name: string, folder: string, config: InitConfig) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [startingPoint, setStartingPoint] = useState<StartingPoint>("blank");

  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scraped, setScraped] = useState<{ colors: string[]; fonts: string[] } | null>(null);
  const [scrapeError, setScrapeError] = useState("");

  const [name, setName] = useState(defaultName);
  const [folder, setFolder] = useState("");
  const [brandHex, setBrandHex] = useState("#4f46e5");
  const [density, setDensity] = useState<Density>("standard");
  const [platform, setPlatform] = useState<TargetPlatform>("web");
  const [destination, setDestination] = useState<EngineeringDestination>("tailwind");

  const isTwin = startingPoint === "material" || startingPoint === "tailwind";

  // The scraped families we can actually load from Google Fonts, routed by
  // role: the first text face drives display/heading/body, the first monospace
  // goes to the mono role. Self-hosted faces ("sohne-var") yield null — we say
  // so up front instead of applying a font that would silently render the
  // fallback.
  const { matchedFont, matchedMono } = useMemo(() => {
    let text: string | null = null;
    let mono: string | null = null;
    for (const f of scraped?.fonts ?? []) {
      const hit = matchGoogleFont(f);
      if (!hit) continue;
      if (hit.category === "mono") mono = mono ?? hit.family;
      else text = text ?? hit.family;
    }
    return { matchedFont: text, matchedMono: mono };
  }, [scraped]);

  // The scrape path needs a successful extraction before step 2 — otherwise
  // "From a live site" would create a file indistinguishable from Blank.
  const scrapeReady = startingPoint !== "scrape" || scraped !== null;

  const pickStart = (sp: StartingPoint) => {
    setStartingPoint(sp);
    // A twin implies its native engineering destination — a sensible default the
    // user can still override on step 2.
    if (sp === "material") setDestination("mui");
    else if (sp === "tailwind") setDestination("tailwind");
  };

  const runScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setScrapeError("");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScrapeError(data.error || "Couldn't read that site");
        setScraped(null);
        return;
      }
      setScraped({ colors: data.colors ?? [], fonts: data.fonts ?? [] });
      if (data.colors?.[0]) setBrandHex(data.colors[0]);
    } catch {
      setScrapeError("Network error — check the URL and try again");
      setScraped(null);
    } finally {
      setScraping(false);
    }
  };

  const submit = () => {
    const config: InitConfig = {
      startingPoint,
      brandHex,
      secondaryHex: startingPoint === "scrape" ? scraped?.colors?.[1] : undefined,
      fontFamily: startingPoint === "scrape" ? (matchedFont ?? undefined) : undefined,
      monoFamily: startingPoint === "scrape" ? (matchedMono ?? undefined) : undefined,
      density,
      targetPlatform: platform,
      engineeringDestination: destination,
    };
    onCreate(name, folder.trim(), config);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line-strong bg-ink-panel p-5"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-serif text-xl tracking-tight text-fg">New design file</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-fg-mute hover:bg-ink-hover hover:text-fg"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mb-4 text-[12px] text-fg-mute">
          Step {step} of 2 · {step === 1 ? "How do you want to start?" : "Name it and set your targets"}
        </p>

        {step === 1 ? (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <StartCard
                icon={<FileStack size={16} />}
                label="Blank system"
                blurb="Start from the agnostic skeleton"
                selected={startingPoint === "blank"}
                onSelect={() => pickStart("blank")}
              />
              <StartCard
                icon={<Globe size={16} />}
                label="From a live site"
                blurb="Extract brand colour + font from a URL"
                selected={startingPoint === "scrape"}
                onSelect={() => pickStart("scrape")}
              />
              <StartCard
                icon={<Layers size={16} />}
                label="Material UI twin"
                blurb={FRAMEWORK_TWINS.material.blurb}
                selected={startingPoint === "material"}
                onSelect={() => pickStart("material")}
              />
              <StartCard
                icon={<Sparkles size={16} />}
                label="Tailwind UI twin"
                blurb={FRAMEWORK_TWINS.tailwind.blurb}
                selected={startingPoint === "tailwind"}
                onSelect={() => pickStart("tailwind")}
              />
            </div>

            {startingPoint === "scrape" && (
              <div className="mt-3 rounded-lg border border-line-strong p-3">
                <span className="mb-1.5 block text-[12px] font-medium text-fg-dim">Site URL</span>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={scrapeUrl}
                    onChange={(e) => setScrapeUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") runScrape();
                    }}
                    placeholder="stripe.com"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-ink px-3 text-sm text-fg placeholder:text-fg-mute focus:border-fg focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={runScrape}
                    disabled={scraping || !scrapeUrl.trim()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13px] font-medium text-fg transition-colors hover:bg-ink-hover disabled:opacity-40"
                  >
                    {scraping ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Extract
                  </button>
                </div>
                {scrapeError && <p className="mt-2 text-[11px] text-red-400">{scrapeError}</p>}
                {scraped && (scraped.colors.length > 0 || scraped.fonts.length > 0) && (
                  <div className="mt-2.5 space-y-1.5">
                    {scraped.colors.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-fg-mute">Colours</span>
                        <div className="flex gap-1">
                          {scraped.colors.map((c) => (
                            <span
                              key={c}
                              title={c}
                              className="h-5 w-5 rounded border border-line"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {matchedFont || matchedMono ? (
                      <p className="text-[11px] text-fg-mute">
                        Font{" "}
                        {matchedFont && <span className="text-fg-dim">{matchedFont}</span>}
                        {matchedFont && " for display, headings and body"}
                        {matchedFont && matchedMono && " · "}
                        {matchedMono && (
                          <>
                            <span className="text-fg-dim">{matchedMono}</span> for code
                          </>
                        )}
                      </p>
                    ) : scraped.fonts.length > 0 ? (
                      <p className="text-[11px] text-fg-mute">
                        Font <span className="text-fg-dim">{scraped.fonts[0]}</span> is self-hosted and
                        can&apos;t be loaded here — your type stays on Inter
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!scrapeReady}
              className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-fg text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Next <ArrowRight size={15} />
            </button>
            {!scrapeReady && (
              <p className="mt-2 text-center text-[11px] text-fg-mute">
                Extract a site first — or pick another starting point.
              </p>
            )}
          </>
        ) : (
          <>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-[12px] font-medium text-fg-dim">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="h-10 w-full rounded-lg border border-line-strong bg-ink px-3 text-sm text-fg focus:border-fg focus:outline-none"
              />
            </label>

            <label className="mb-3 block">
              <span className="mb-1.5 block text-[12px] font-medium text-fg-dim">
                Client <span className="text-fg-mute">— optional, groups files on the dashboard</span>
              </span>
              <FolderField id="new-file-folder" value={folder} onChange={setFolder} folderNames={folderNames} />
            </label>

            <div className="mb-3">
              <span className="mb-1.5 block text-[12px] font-medium text-fg-dim">Brand colour</span>
              <HexInput value={brandHex} onChange={setBrandHex} />
            </div>

            {startingPoint === "scrape" && scraped && (
              <p className="mb-3 rounded-lg border border-line px-3 py-2 text-[11px] leading-relaxed text-fg-mute">
                From the site: brand{scraped.colors.length > 1 ? " + secondary" : ""} colour
                {matchedFont ? (
                  <>
                    {" "}and the <span className="text-fg-dim">{matchedFont}</span> typeface
                  </>
                ) : matchedMono ? (
                  <>
                    {" "}and <span className="text-fg-dim">{matchedMono}</span> for code
                  </>
                ) : (
                  " (its typeface isn't publicly available, so Inter stays)"
                )}{" "}
                will seed this system.
              </p>
            )}

            {isTwin ? (
              <p className="mb-3 rounded-lg border border-line px-3 py-2 text-[11px] leading-relaxed text-fg-mute">
                {FRAMEWORK_TWINS[startingPoint as "material" | "tailwind"].label} sets{" "}
                {FRAMEWORK_TWINS[startingPoint as "material" | "tailwind"].fonts.body} type, a{" "}
                {FRAMEWORK_TWINS[startingPoint as "material" | "tailwind"].density} baseline and its own
                corner, shadow and motion language — all editable later.
              </p>
            ) : (
              <div className="mb-3">
                <span className="mb-1.5 block text-[12px] font-medium text-fg-dim">Density</span>
                <PillGroup value={density} onChange={setDensity} options={DENSITY_OPTIONS} />
              </div>
            )}

            <div className="mb-3">
              <span className="mb-1.5 block text-[12px] font-medium text-fg-dim">Target platform</span>
              <PillGroup value={platform} onChange={setPlatform} options={PLATFORM_OPTIONS} />
            </div>

            <div className="mb-5">
              <span className="mb-1.5 block text-[12px] font-medium text-fg-dim">
                Engineering destination <span className="text-fg-mute">— opens first at Ship</span>
              </span>
              <PillGroup value={destination} onChange={setDestination} options={DESTINATION_OPTIONS} cols={4} />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line-strong px-4 text-sm font-medium text-fg transition-colors hover:bg-ink-hover"
              >
                <ArrowLeft size={15} /> Back
              </button>
              <button
                type="button"
                onClick={submit}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-fg text-sm font-medium text-ink transition-opacity hover:opacity-90"
              >
                <Plus size={15} /> Create file
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MoveMenu({
  project,
  folderNames,
  onClose,
  onMove,
}: {
  project: ProjectState;
  folderNames: string[];
  onClose: () => void;
  onMove: (folder: string) => void;
}) {
  const [value, setValue] = useState(project.folder ?? "");
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-9 z-30 w-56 rounded-lg border border-line-strong bg-ink-raised p-3 shadow-lg"
    >
      <p className="mb-2 text-[11px] font-medium text-fg-dim">Move to client</p>
      <FolderField id={`move-folder-${project.id}`} value={value} onChange={setValue} folderNames={folderNames} />
      <div className="mt-2 flex gap-1.5">
        <button
          onClick={() => onMove(value.trim())}
          className="flex-1 rounded-md bg-fg px-2.5 py-1.5 text-[12px] font-medium text-ink"
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="rounded-md border border-line-strong px-2.5 py-1.5 text-[12px] text-fg-dim hover:bg-ink-hover"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ProjectDashboard() {
  const projects = useDesignSystem((s) => s.projects);
  const user = useDesignSystem((s) => s.user);
  const logout = useDesignSystem((s) => s.logout);
  const chromeTheme = useDesignSystem((s) => s.chromeTheme);
  const toggleChromeTheme = useDesignSystem((s) => s.toggleChromeTheme);
  const selectProject = useDesignSystem((s) => s.selectProject);
  const createProject = useDesignSystem((s) => s.createProject);
  const deleteProject = useDesignSystem((s) => s.deleteProject);
  const duplicateProject = useDesignSystem((s) => s.duplicateProject);
  const renameProject = useDesignSystem((s) => s.renameProject);
  const moveProjectToFolder = useDesignSystem((s) => s.moveProjectToFolder);
  const renameFolderEverywhere = useDesignSystem((s) => s.renameFolderEverywhere);
  const deleteFolder = useDesignSystem((s) => s.deleteFolder);
  const applyInitConfig = useDesignSystem((s) => s.applyInitConfig);

  const [search, setSearch] = useState("");
  const [isRenameId, setIsRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [notice, setNotice] = useState("");
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [moveMenuId, setMoveMenuId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const projectList = Object.values(projects || {}).sort((a, b) => b.updatedAt - a.updatedAt);
  const filteredProjects = projectList.filter((p) =>
    p?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const folderNames = useMemo(
    () =>
      Array.from(new Set(projectList.map((p) => p.folder).filter((f): f is string => Boolean(f)))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [projectList]
  );

  // Named clients first (alphabetical), unfiled files trail in their own section —
  // solo users with no clients yet never see a section header at all.
  const sections = useMemo(() => {
    const byFolder = new Map<string, ProjectState[]>();
    for (const p of filteredProjects) {
      const key = p.folder ?? UNFILED;
      if (!byFolder.has(key)) byFolder.set(key, []);
      byFolder.get(key)!.push(p);
    }
    const ordered = [...folderNames.filter((f) => byFolder.has(f)), UNFILED].filter((k) =>
      byFolder.has(k)
    );
    return ordered.map((key) => ({ key, projects: byFolder.get(key)! }));
  }, [filteredProjects, folderNames]);

  const atLimit = projectList.length >= PROJECT_LIMIT;
  const flatView = sections.length <= 1 && sections[0]?.key === UNFILED;

  const handleCreate = async (name: string, folder: string, config: InitConfig) => {
    setNotice("");
    const ok = await createProject(name, folder || undefined);
    if (!ok) {
      // createProject returns false both at the limit and on a failed save —
      // only blame the limit when we're actually at it.
      setNotice(
        projectList.length >= PROJECT_LIMIT
          ? `You've reached the limit of ${PROJECT_LIMIT} design files.`
          : "Couldn't create the file — check your connection and try again."
      );
      return;
    }
    // createProject selects the new file, so applyInitConfig targets it.
    applyInitConfig(config);
    setNewFileOpen(false);
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotice("");
    const ok = await duplicateProject(id);
    if (!ok) setNotice(`You've reached the limit of ${PROJECT_LIMIT} design files.`);
  };

  const handleRenameSubmit = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (renameValue.trim()) renameProject(id, renameValue.trim());
    setIsRenameId(null);
  };

  const handleFolderRename = (oldName: string) => {
    const next = window.prompt(`Rename client "${oldName}" to:`, oldName);
    if (next && next.trim() && next.trim() !== oldName) renameFolderEverywhere(oldName, next.trim());
  };

  const handleFolderDelete = (name: string) => {
    if (window.confirm(`Ungroup "${name}"? Its files stay — they just won't be filed under a client.`)) {
      deleteFolder(name);
    }
  };

  const toggleCollapsed = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // A project's own palette is the only colour on screen — this stays true to
  // Arkitype's monochrome chrome, and lets a designer recognise a file at a glance.
  const paletteOf = (p: ProjectState): string[] => {
    const brand = p.primitives.colorFamilies?.find((f) => f.id === "brand");
    const secondary = p.primitives.colorFamilies?.find((f) => f.id === "secondary");
    const colors: string[] = [];
    if (brand?.seed) colors.push(brand.seed);
    if (secondary?.seed) colors.push(secondary.seed);
    const brandRamp = p.primitives.colors?.brand;
    if (brandRamp?.[6]) colors.push(brandRamp[6]);
    if (brandRamp?.[3]) colors.push(brandRamp[3]);
    const secondaryRamp = p.primitives.colors?.secondary;
    if (secondaryRamp?.[4]) colors.push(secondaryRamp[4]);
    return colors.length ? colors.slice(0, 5) : ["#8E8E93", "#C8C8C8"];
  };

  const renderCard = (p: ProjectState) => {
    const palette = paletteOf(p);
    const isRenaming = isRenameId === p.id;
    const isMoving = moveMenuId === p.id;

    return (
      <div
        key={p.id}
        onClick={() => selectProject(p.id)}
        className="group relative cursor-pointer overflow-hidden rounded-xl border border-line bg-ink-panel transition-colors hover:border-line-strong"
      >
        {/* Palette preview — the file's actual colours */}
        <div className="relative flex h-28 overflow-hidden">
          {palette.map((color, idx) => (
            <span key={idx} className="flex-1" style={{ backgroundColor: color }} />
          ))}

          {/* Hover actions */}
          <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              title="Move to client"
              onClick={(e) => {
                e.stopPropagation();
                setMoveMenuId(isMoving ? null : p.id);
              }}
              className="rounded-md border border-line bg-ink-raised p-1.5 text-fg-dim transition-colors hover:text-fg"
            >
              <FolderInput size={14} />
            </button>
            <button
              title="Duplicate"
              onClick={(e) => handleDuplicate(p.id, e)}
              className="rounded-md border border-line bg-ink-raised p-1.5 text-fg-dim transition-colors hover:text-fg"
            >
              <Copy size={14} />
            </button>
            <button
              title="Rename"
              onClick={(e) => {
                e.stopPropagation();
                setIsRenameId(p.id);
                setRenameValue(p.name);
              }}
              className="rounded-md border border-line bg-ink-raised p-1.5 text-fg-dim transition-colors hover:text-fg"
            >
              <Pencil size={14} />
            </button>
            <button
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${p.name}"? This can't be undone.`)) {
                  deleteProject(p.id);
                }
              }}
              className="rounded-md border border-line bg-ink-raised p-1.5 text-fg-dim transition-colors hover:border-red-500/50 hover:text-red-500 dark:hover:text-red-400"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {isMoving && (
            <MoveMenu
              project={p}
              folderNames={folderNames}
              onClose={() => setMoveMenuId(null)}
              onMove={(folder) => {
                moveProjectToFolder(p.id, folder || null);
                setMoveMenuId(null);
              }}
            />
          )}
        </div>

        {/* Info */}
        <div className="border-t border-line/60 px-4 py-3.5">
          {isRenaming ? (
            <form
              onSubmit={(e) => handleRenameSubmit(p.id, e)}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                onBlur={() => setIsRenameId(null)}
                className="min-w-0 flex-1 rounded-md border border-fg bg-ink px-2.5 py-1.5 text-sm text-fg focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-md bg-fg px-3 py-1.5 text-sm font-medium text-ink"
              >
                Save
              </button>
            </form>
          ) : (
            <>
              <h3 className="truncate text-base font-medium text-fg">{p.name}</h3>
              <p className="mt-0.5 text-sm text-fg-mute">
                Edited {formatRelativeTime(p.updatedAt)}
              </p>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-ink text-fg font-sans">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-line/60 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2.5 font-serif text-2xl tracking-tight text-fg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={28} height={28} className="rounded-md" />
            Arkitype
            <BetaTag />
          </span>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleChromeTheme}
              aria-label="Toggle light or dark theme"
              className="rounded-full p-2.5 text-fg-mute transition-colors hover:bg-ink-hover hover:text-fg"
            >
              {chromeTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {user?.email && (
              <span className="hidden text-sm text-fg-mute sm:block">{user.email}</span>
            )}
            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-ink-hover"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-5 border-b border-line/60 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-4xl tracking-tight text-fg">Design files</h1>
            <p className="mt-2 text-base text-fg-dim">
              {projectList.length === 0
                ? "Create your first system to get started."
                : `${projectList.length} of ${PROJECT_LIMIT} files${
                    folderNames.length ? ` · ${folderNames.length} client${folderNames.length === 1 ? "" : "s"}` : ""
                  }.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-mute" size={16} />
              <input
                type="text"
                placeholder="Search files"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-44 rounded-lg border border-line-strong bg-ink-panel py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-fg-mute transition-colors focus:border-fg focus:outline-none sm:w-56"
              />
            </div>
            <button
              onClick={() => setNewFileOpen(true)}
              disabled={atLimit}
              className="inline-flex items-center gap-2 rounded-lg bg-fg px-5 py-2.5 text-[15px] font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Plus size={17} /> New file
            </button>
          </div>
        </div>

        {notice && (
          <div className="mt-6 rounded-lg border border-line-strong bg-ink-panel px-4 py-3 text-sm text-fg-dim">
            {notice}
          </div>
        )}

        {filteredProjects.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-6 py-20 text-center">
            <h3 className="font-serif text-2xl tracking-tight text-fg">
              {search ? "No matching files" : "No design files yet"}
            </h3>
            <p className="mt-2 max-w-sm text-sm text-fg-dim">
              {search
                ? "Try a different name."
                : "Start a file to build primitives, semantic roles, and components."}
            </p>
            {!search && (
              <button
                onClick={() => setNewFileOpen(true)}
                className="mt-7 inline-flex items-center gap-2 rounded-lg bg-fg px-6 py-3 text-[15px] font-medium text-ink transition-opacity hover:opacity-90"
              >
                <Plus size={17} /> Create a file
              </button>
            )}
          </div>
        ) : flatView ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map(renderCard)}
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {sections.map(({ key, projects: sectionProjects }) => {
              const isUnfiled = key === UNFILED;
              const isCollapsed = collapsed.has(key);
              return (
                <section key={key}>
                  <div className="mb-3 flex items-center gap-2">
                    <button
                      onClick={() => toggleCollapsed(key)}
                      className="flex items-center gap-1.5 text-fg-dim hover:text-fg"
                    >
                      {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                      <Folder size={14} className={isUnfiled ? "text-fg-mute" : "text-fg-dim"} />
                      <span className="text-[13px] font-medium">
                        {isUnfiled ? "Unfiled" : key}
                      </span>
                      <span className="text-[12px] text-fg-mute">({sectionProjects.length})</span>
                    </button>
                    {!isUnfiled && (
                      <div className="flex items-center gap-1 opacity-60 hover:opacity-100">
                        <button
                          title="Rename client"
                          onClick={() => handleFolderRename(key)}
                          className="rounded p-1 text-fg-mute hover:bg-ink-hover hover:text-fg"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          title="Ungroup client"
                          onClick={() => handleFolderDelete(key)}
                          className="rounded p-1 text-fg-mute hover:bg-ink-hover hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {sectionProjects.map(renderCard)}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>

      {newFileOpen && (
        <NewFileWizard
          defaultName={`Design System ${projectList.length + 1}`}
          folderNames={folderNames}
          onClose={() => setNewFileOpen(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
