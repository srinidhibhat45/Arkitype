const VALUE_MODE = "mode:value";
const LIGHT_MODE = "mode:light";
const DARK_MODE = "mode:dark";

/* Plugin-data keys — the update-in-place contract. Pages, sections, and
 * component sets are tagged so a re-sync finds and updates the same nodes
 * instead of duplicating them (and never breaks existing instances). */
const PAGE_KEY = "ark:pageId";
const SECTION_KEY = "ark:sectionId";
const COMP_KEY = "ark:componentId";
const OWNED_KEY = "ark:owned";

/* The user's font roles, resolved from the bundle at generation time so the
 * drawn components use the system's actual typefaces (with Inter fallback). */
let FONTS = { body: "Inter", heading: "Inter", mono: "Courier New" };

/* The icon library (Material Symbols) materialised on the "Icons" page: one
 * component per ligature, reused by name across syncs so both the swappable
 * library and any instances placed in components survive re-runs. Populated by
 * buildIconLibraryPage() before component pages are drawn. */
let ICON_LIB: {
  components: Map<string, ComponentNode>;
  defaultName: string | null;
  font: FontName;
  glyphs: boolean; // true when the real Material Symbols font loaded
} | null = null;

/* Documentation chrome palette — deliberately literal (light, neutral): this
 * is the kit's editorial layer, not part of the user's themed system. */
const DOC = {
  pageBg: { r: 0.957, g: 0.957, b: 0.965 } as RGB,
  card: { r: 1, g: 1, b: 1 } as RGB,
  panel: { r: 0.97, g: 0.973, b: 0.98 } as RGB,
  ink: { r: 0.09, g: 0.1, b: 0.13 } as RGB,
  inkMuted: { r: 0.4, g: 0.42, b: 0.47 } as RGB,
  inkFaint: { r: 0.6, g: 0.62, b: 0.67 } as RGB,
  line: { r: 0.885, g: 0.89, b: 0.91 } as RGB,
  green: { r: 0.13, g: 0.55, b: 0.33 } as RGB,
  red: { r: 0.75, g: 0.2, b: 0.22 } as RGB,
  accent: { r: 0.38, g: 0.4, b: 0.95 } as RGB,
};

// Helper: Log message back to the UI iframe
function log(text: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') {
  figma.ui.postMessage({ type: 'log', text, level });
}

// Helper: Report sync status to UI (document-wide, all pages)
function updateStatusInUi() {
  const collections = figma.variables.getLocalVariableCollections();
  const primitives = collections.find(c => c.name === "Arkitype / Primitives");
  const semantics = collections.find(c => c.name === "Arkitype / Semantics");

  if (primitives && semantics) {
    const vars = figma.variables.getLocalVariables();
    const count = vars.filter(v =>
      v.variableCollectionId === primitives.id ||
      v.variableCollectionId === semantics.id
    ).length;

    // Count Arkitype component sets across the whole document
    const componentSets = figma.root.findAll(node =>
      (node.type === "COMPONENT_SET" || node.type === "COMPONENT") &&
      (node.getPluginData(COMP_KEY) !== "" || node.name.startsWith("Arkitype / "))
    );
    const arkPages = figma.root.children.filter(p => p.getPluginData(PAGE_KEY) !== "");

    figma.ui.postMessage({
      type: 'schema-status',
      detected: true,
      projectName: figma.root.getPluginData("ark:systemName") || "Arkitype System",
      tokenCount: count,
      componentCount: componentSets.length,
      pageCount: arkPages.length,
      lastSync: figma.root.getPluginData("ark:lastSync") || null
    });
  } else {
    figma.ui.postMessage({
      type: 'schema-status',
      detected: false
    });
  }
}

// Show UI with larger comfortable default box size
figma.showUI(__html__, { width: 540, height: 680 });
updateStatusInUi();

// Messaging event handler
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'check-current-file') {
    updateStatusInUi();
  } else if (msg.type === 'sync-variables') {
    try {
      await syncVariables(msg.payload);
      figma.ui.postMessage({
        type: 'sync-complete',
        success: true,
        message: 'Variables successfully synchronized in Figma!'
      });
      updateStatusInUi();
    } catch (e: any) {
      log(`Error syncing variables: ${e.message}`, 'error');
      figma.ui.postMessage({
        type: 'sync-complete',
        success: false,
        message: `Sync failed: ${e.message}`
      });
    }
  } else if (msg.type === 'generate-components') {
    try {
      await syncVariables(msg.payload); // Make sure variables are sync'd first
      await buildDesignSystemFile(msg.payload);
      figma.ui.postMessage({
        type: 'sync-complete',
        success: true,
        message: 'Design system file generated — check the pages panel for Cover, Foundations, and component pages.'
      });
      updateStatusInUi();
    } catch (e: any) {
      log(`Error generating design system: ${e.message}`, 'error');
      figma.ui.postMessage({
        type: 'sync-complete',
        success: false,
        message: `Generation failed: ${e.message}`
      });
    }
  }
};

// Variable Sync Engine
async function syncVariables(bundle: any) {
  log("Starting variable synchronization...", "info");
  
  const localCollections = figma.variables.getLocalVariableCollections();
  
  // 1. Get or Create Primitives Collection
  let primitivesColl = localCollections.find(c => c.name === "Arkitype / Primitives");
  if (!primitivesColl) {
    primitivesColl = figma.variables.createVariableCollection("Arkitype / Primitives");
    log("Created collection 'Arkitype / Primitives'", "success");
  }
  
  // Primitives has single mode "Value"
  const primModeName = "Value";
  const primModes = primitivesColl.modes;
  const primModeId = primModes[0].modeId;
  if (primModes[0].name !== primModeName) {
    primitivesColl.renameMode(primModeId, primModeName);
  }

  // 2. Get or Create Semantics Collection
  let semanticsColl = localCollections.find(c => c.name === "Arkitype / Semantics");
  if (!semanticsColl) {
    semanticsColl = figma.variables.createVariableCollection("Arkitype / Semantics");
    log("Created collection 'Arkitype / Semantics'", "success");
  }

  // Semantics has "Light" and "Dark" modes
  let lightModeId = "";
  let darkModeId = "";
  
  // Align modes in Semantics robustly
  const semModes = semanticsColl.modes;
  if (semModes.length === 1) {
    semanticsColl.renameMode(semModes[0].modeId, "Light");
    lightModeId = semModes[0].modeId;
    darkModeId = semanticsColl.addMode("Dark");
    log("Aligned Semantics collection to Light/Dark modes", "info");
  } else {
    // Check if we have light/dark modes
    const lightMode = semModes.find(m => m.name.toLowerCase().includes("light"));
    const darkMode = semModes.find(m => m.name.toLowerCase().includes("dark"));
    
    if (lightMode) {
      lightModeId = lightMode.modeId;
      if (lightMode.name !== "Light") semanticsColl.renameMode(lightModeId, "Light");
    } else {
      lightModeId = semModes[0].modeId;
      semanticsColl.renameMode(lightModeId, "Light");
    }
    
    if (darkMode) {
      darkModeId = darkMode.modeId;
      if (darkMode.name !== "Dark") semanticsColl.renameMode(darkModeId, "Dark");
    } else {
      darkModeId = semModes[1].modeId;
      semanticsColl.renameMode(darkModeId, "Dark");
    }
  }

  const allFigmaVars = figma.variables.getLocalVariables();
  const variableMap = new Map<string, Variable>(); // maps "CollectionName/path" -> Variable object

  // 3. Pass 1: Create all variables and set literal values
  log("Pass 1: Creating variables and writing literal values...", "info");
  const bundleCollections = bundle.collections;
  
  for (const bundleColl of bundleCollections) {
    const isSemantics = bundleColl.name.includes("Semantics");
    const targetColl = isSemantics ? semanticsColl : primitivesColl;
    
    for (const bundleVar of bundleVarArray(bundleColl)) {
      const varName = bundleVar.name;
      const type = bundleVar.resolvedType;
      
      // Check if variable exists
      let figmaVar = allFigmaVars.find(v => 
        v.variableCollectionId === targetColl.id && v.name === varName
      );
      
      if (!figmaVar) {
        figmaVar = figma.variables.createVariable(varName, targetColl.id, type);
      }
      
      variableMap.set(`${isSemantics ? "Semantics" : "Primitives"}/${varName}`, figmaVar);

      // Set literal values for each mode
      for (const [modeKey, modeVal] of Object.entries(bundleVar.valuesByMode)) {
        let figmaModeId = isSemantics ? (modeKey === DARK_MODE ? darkModeId : lightModeId) : primModeId;
        
        // Skip alias bindings in first pass
        if (modeVal && typeof modeVal === "object" && (modeVal as any).type === "VARIABLE_ALIAS") {
          continue;
        }
        
        // Write literal value
        try {
          if (type === "COLOR" && typeof modeVal === "object") {
            figmaVar.setValueForMode(figmaModeId, modeVal as RGBA);
          } else {
            figmaVar.setValueForMode(figmaModeId, modeVal as any);
          }
        } catch (err: any) {
          log(`Error setting value for ${varName}: ${err.message}`, "warning");
        }
      }
    }
  }

  // 4. Pass 2: Resolve aliases
  log("Pass 2: Linking alias variable references...", "info");
  for (const bundleColl of bundleCollections) {
    const isSemantics = bundleColl.name.includes("Semantics");
    
    for (const bundleVar of bundleVarArray(bundleColl)) {
      const varName = bundleVar.name;
      const figmaVar = variableMap.get(`${isSemantics ? "Semantics" : "Primitives"}/${varName}`);
      if (!figmaVar) continue;
      
      for (const [modeKey, modeVal] of Object.entries(bundleVar.valuesByMode)) {
        let figmaModeId = isSemantics ? (modeKey === DARK_MODE ? darkModeId : lightModeId) : primModeId;
        
        if (modeVal && typeof modeVal === "object" && (modeVal as any).type === "VARIABLE_ALIAS") {
          const aliasVal = modeVal as any;
          const targetVar = variableMap.get(`Primitives/${aliasVal.id}`);
          if (targetVar) {
            try {
              const alias = figma.variables.createVariableAlias(targetVar);
              figmaVar.setValueForMode(figmaModeId, alias);
            } catch (err: any) {
              log(`Failed to bind alias ${varName} -> ${aliasVal.id}: ${err.message}`, "warning");
            }
          }
        }
      }
    }
  }
  
  // 5. Elevation tokens → shared local effect styles.
  ensureElevationStyles(bundle);

  log(`Synced ${variableMap.size} variables successfully.`, "success");
}

function bundleVarArray(bundleColl: any): any[] {
  return bundleColl.variables || [];
}

/* ════════════════════════════════════════════════════════════════════
 *  DESIGN SYSTEM FILE ENGINE
 *  Builds a complete multi-page kit: Cover → Getting started →
 *  Foundations (Colour / Typography / Space / Shape / Motion) →
 *  one page per component lane → Changelog. Idempotent: every page,
 *  sheet, and component set is tagged with plugin data so a re-sync
 *  updates the same nodes in place and never breaks instances.
 * ════════════════════════════════════════════════════════════════════ */

async function buildDesignSystemFile(bundle: any) {
  const components = bundle.components || [];
  log(`Building design system file (${components.length} components)...`, "info");
  await loadStandardFonts();
  resolveSystemFonts(bundle);

  const systemName = (bundle.meta && bundle.meta.systemName) || "Arkitype System";
  figma.root.setPluginData("ark:systemName", systemName);

  const figmaVarsMap = buildFigmaVarsMap();

  /* Elevation levels become local effect styles (Light + Dark) so components
   * cast real shadows via a shared style, not baked-in per-node effects. */
  ensureElevationStyles(bundle);

  /* Page structure (with fallback for bundles without `structure`).
   * New bundles carry one page per component (`laneLabel` set); legacy
   * bundles carry one page per lane. */
  const LANE_EMOJI: Record<string, string> = {
    controls: "🎛", display: "🏷", navigation: "🧭", patterns: "🧩",
  };
  const lanes: Array<{ id: string; label: string; note: string; lane?: string; laneLabel?: string; components: string[] }> =
    (bundle.structure && bundle.structure.pages && bundle.structure.pages.length > 0)
      ? bundle.structure.pages
      : [{ id: "library", label: "Library", note: "", components: components.map((c: any) => c.id) }];

  /* Ensure all pages exist, in kit order */
  let order = 0;
  const coverPage = ensurePage("cover", "⛰️  Cover", order++);
  const startPage = ensurePage("start", "🚀  Getting started", order++);
  const colourPage = ensurePage("f-colour", "🎨  Foundations · Colour", order++);
  const typePage = ensurePage("f-type", "🔤  Foundations · Typography", order++);
  const spacePage = ensurePage("f-space", "📐  Foundations · Space & Layout", order++);
  const shapePage = ensurePage("f-shape", "🧊  Foundations · Shape & Elevation", order++);
  const motionPage = ensurePage("f-motion", "🎞️  Foundations · Motion", order++);
  const iconsOrder = order++;
  const lanePages = lanes.map((lane) => {
    const perComponent = !!lane.laneLabel;
    const key = perComponent ? `comp-${lane.id}` : `lane-${lane.id}`;
    const emoji = LANE_EMOJI[(lane.lane || lane.id) as string] || "📦";
    const name = perComponent
      ? `${emoji}  ${lane.laneLabel} · ${lane.label}`
      : `${emoji}  Components · ${lane.label}`;
    return { lane, page: ensurePage(key, name, order++) };
  });
  const changelogPage = ensurePage("changelog", "🕓  Changelog", order++);

  /* Retire Arkitype pages that this structure no longer produces (e.g. the
   * old per-lane pages after moving to one page per component). Their live
   * component sets get rescued onto the new pages before the sheet rebuild,
   * so only empty husks are ever deleted. */
  const expectedKeys = new Set<string>([
    "cover", "start", "f-colour", "f-type", "f-space", "f-shape", "f-motion", "icons", "changelog",
  ]);
  lanePages.forEach(({ page }) => expectedKeys.add(page.getPluginData(PAGE_KEY)));
  const stalePages = figma.root.children.filter(
    (p) => p.getPluginData(PAGE_KEY) !== "" && !expectedKeys.has(p.getPluginData(PAGE_KEY))
  );

  /* Documentation pages (fully rebuilt each sync) */
  await buildCoverPage(coverPage, bundle, figmaVarsMap);
  await buildGettingStartedPage(startPage, bundle);
  await buildColourPage(colourPage, bundle, figmaVarsMap);
  await buildTypographyPage(typePage, bundle);
  await buildSpacePage(spacePage, bundle, figmaVarsMap);
  await buildShapePage(shapePage, bundle, figmaVarsMap);
  await buildMotionPage(motionPage, bundle);

  /* Icon library — must exist before component pages so icon slots can place
   * instances of it. */
  await buildIconLibraryPage(bundle, figmaVarsMap, iconsOrder);

  /* Component pages (sets preserved across syncs) */
  const existingSets = collectExistingComponents();
  for (const { lane, page } of lanePages) {
    let y = 100;
    y = await buildLaneHeader(page, lane, y);
    for (const cid of lane.components) {
      const comp = components.find((c: any) => c.id === cid);
      if (!comp) continue;
      try {
        log(`Building sheet for '${comp.name}'...`, "info");
        y = await buildComponentSection(page, comp, figmaVarsMap, y, existingSets);
      } catch (compErr: any) {
        log(`Error building '${comp.name}': ${compErr.message}`, "error");
      }
    }
  }

  /* Now that live sets have been rescued onto their new pages, drop stale
   * Arkitype pages — but only if nothing user-made is left on them. */
  for (const stale of stalePages) {
    try {
      [...stale.children].forEach((child) => {
        if (child.getPluginData(OWNED_KEY) === "1" || child.getPluginData(SECTION_KEY) !== "") {
          child.remove();
        }
      });
      if (stale.children.length === 0 && stale.id !== figma.currentPage.id) {
        log(`Removing stale page '${stale.name}'`, "warning");
        stale.remove();
      }
    } catch (e: any) {
      log(`Could not clean up page '${stale.name}': ${e.message}`, "warning");
    }
  }

  await appendChangelogEntry(changelogPage, bundle);
  figma.root.setPluginData("ark:lastSync", new Date().toISOString());
  log("Design system file complete.", "success");
}

/* ── infrastructure helpers ── */

function buildFigmaVarsMap(): Map<string, Variable> {
  const collections = figma.variables.getLocalVariableCollections();
  const primitivesColl = collections.find(c => c.name === "Arkitype / Primitives");
  const map = new Map<string, Variable>();
  figma.variables.getLocalVariables().forEach(v => {
    const colName = primitivesColl && v.variableCollectionId === primitivesColl.id ? "Primitives" : "Semantics";
    map.set(`${colName}/${v.name}`, v);
  });
  return map;
}

/** Read a primitive variable's literal value straight from the bundle. */
function bundleVarValue(bundle: any, name: string): any {
  for (const coll of bundle.collections || []) {
    for (const v of coll.variables || []) {
      if (v.name === name) return v.valuesByMode[VALUE_MODE];
    }
  }
  return undefined;
}

function resolveSystemFonts(bundle: any) {
  FONTS.body = bundleVarValue(bundle, "font/body") || "Inter";
  FONTS.heading = bundleVarValue(bundle, "font/heading") || FONTS.body;
  FONTS.mono = bundleVarValue(bundle, "font/mono") || "Courier New";
}

/** Find-or-create a page by plugin-data id, keep it named + ordered. */
function ensurePage(id: string, name: string, index: number): PageNode {
  let page = figma.root.children.find(p => p.getPluginData(PAGE_KEY) === id) as PageNode | undefined;
  if (!page) {
    page = figma.createPage();
    page.setPluginData(PAGE_KEY, id);
    log(`Created page '${name}'`, "success");
  }
  page.name = name;
  page.backgrounds = [{ type: "SOLID", color: DOC.pageBg }];
  try {
    figma.root.insertChild(Math.min(index, figma.root.children.length - 1), page);
  } catch (e) { /* ordering is cosmetic — never fail a sync over it */ }
  return page;
}

/** Remove the frames we own on a docs page (sections are handled separately). */
function clearOwnedContent(page: PageNode) {
  [...page.children].forEach(child => {
    if (child.getPluginData(OWNED_KEY) === "1" && child.getPluginData(SECTION_KEY) === "") {
      child.remove();
    }
  });
}

/* ── doc-chrome drawing helpers (editorial layer, Inter, light) ── */

async function docText(
  parent: BaseNode & ChildrenMixin,
  characters: string,
  fontSize: number,
  style: string,
  color: RGB,
  opts: { width?: number; name?: string; letterSpacing?: number; mono?: boolean } = {}
): Promise<TextNode> {
  const t = figma.createText();
  t.name = opts.name || "text";
  t.fontName = await loadFontSafe(opts.mono ? "Courier New" : "Inter", style);
  t.characters = characters;
  t.fontSize = fontSize;
  t.fills = [{ type: "SOLID", color }];
  if (opts.letterSpacing) t.letterSpacing = { value: opts.letterSpacing, unit: "PERCENT" };
  if (opts.width) {
    t.resize(opts.width, t.height);
    t.textAutoResize = "HEIGHT";
  }
  parent.appendChild(t);
  return t;
}

function stackFrame(
  parent: (BaseNode & ChildrenMixin) | null,
  name: string,
  direction: "VERTICAL" | "HORIZONTAL",
  spacing: number,
  padding = 0
): FrameNode {
  const f = figma.createFrame();
  f.name = name;
  f.layoutMode = direction;
  f.itemSpacing = spacing;
  f.paddingTop = padding; f.paddingBottom = padding;
  f.paddingLeft = padding; f.paddingRight = padding;
  f.primaryAxisSizingMode = "AUTO";
  f.counterAxisSizingMode = "AUTO";
  f.fills = [];
  if (parent) parent.appendChild(f);
  return f;
}

/** A white doc card placed loose on a page. */
function docCard(page: PageNode, name: string, x: number, y: number): FrameNode {
  const card = stackFrame(page, name, "VERTICAL", 28, 48);
  card.setPluginData(OWNED_KEY, "1");
  card.x = x; card.y = y;
  card.fills = [{ type: "SOLID", color: DOC.card }];
  card.cornerRadius = 20;
  card.strokes = [{ type: "SOLID", color: DOC.line }];
  card.strokeWeight = 1;
  return card;
}

async function docChip(parent: BaseNode & ChildrenMixin, label: string, color: RGB): Promise<FrameNode> {
  const chip = stackFrame(parent, "chip", "HORIZONTAL", 0, 0);
  chip.paddingTop = 3; chip.paddingBottom = 3;
  chip.paddingLeft = 10; chip.paddingRight = 10;
  chip.cornerRadius = 99;
  chip.fills = [{ type: "SOLID", color: DOC.panel }];
  chip.strokes = [{ type: "SOLID", color: DOC.line }];
  chip.strokeWeight = 1;
  await docText(chip, label.toUpperCase(), 9, "Bold", color, { letterSpacing: 6 });
  return chip;
}

async function docPageHeader(page: PageNode, title: string, subtitle: string): Promise<void> {
  const header = stackFrame(page, "Page header", "VERTICAL", 10, 0);
  header.setPluginData(OWNED_KEY, "1");
  header.x = 100; header.y = 100;
  await docText(header, title, 40, "Bold", DOC.ink, { name: "title" });
  if (subtitle) await docText(header, subtitle, 14, "Regular", DOC.inkMuted, { width: 760, name: "subtitle" });
}

/* ── cover / getting started ── */

async function buildCoverPage(page: PageNode, bundle: any, figmaVarsMap: Map<string, Variable>) {
  clearOwnedContent(page);
  const cover = figma.createFrame();
  cover.name = "Cover";
  cover.setPluginData(OWNED_KEY, "1");
  cover.resize(1440, 900);
  cover.x = 0; cover.y = 0;
  cover.fills = [{ type: "SOLID", color: DOC.card }];
  cover.layoutMode = "VERTICAL";
  cover.primaryAxisAlignItems = "CENTER";
  cover.counterAxisAlignItems = "CENTER";
  cover.itemSpacing = 24;
  cover.primaryAxisSizingMode = "FIXED";
  cover.counterAxisSizingMode = "FIXED";
  page.appendChild(cover);

  const accentBar = figma.createFrame();
  accentBar.name = "accent";
  accentBar.resize(220, 10);
  accentBar.cornerRadius = 99;
  const accentVar = figmaVarsMap.get("Semantics/action/primary/default");
  accentBar.fills = accentVar
    ? [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: DOC.accent }, "color", accentVar)]
    : [{ type: "SOLID", color: DOC.accent }];
  cover.appendChild(accentBar);

  await docText(cover, "DESIGN SYSTEM", 13, "Bold", DOC.inkFaint, { letterSpacing: 18 });
  await docText(cover, (bundle.meta && bundle.meta.systemName) || "Arkitype System", 72, "Bold", DOC.ink);

  const metaRow = stackFrame(cover, "meta", "HORIZONTAL", 12, 0);
  const generated = bundle.meta && bundle.meta.generatedAt ? new Date(bundle.meta.generatedAt) : new Date();
  const dateStr = generated.toISOString().slice(0, 10);
  await docText(metaRow, `v${(bundle.meta && bundle.meta.version) || "1.0"}   ·   ${dateStr}   ·   ${(bundle.meta && bundle.meta.tokenCount) || "—"} tokens   ·   ${(bundle.components || []).length} components`, 14, "Medium", DOC.inkMuted);

  await docText(cover, "Generated with Arkitype — tokens, variants, and docs stay in sync with the source system.", 12, "Regular", DOC.inkFaint);
}

async function buildGettingStartedPage(page: PageNode, bundle: any) {
  clearOwnedContent(page);
  await docPageHeader(page, "Getting started", "How this file is organised, and how to consume it without breaking the link back to the source system.");

  const card = docCard(page, "Guide", 100, 260);
  const sections: Array<[string, string]> = [
    ["1 · Tokens live in Variables",
      "Open the Variables panel to find two collections: “Arkitype / Primitives” (raw scales — colour ramps, spacing, radii, type sizes) and “Arkitype / Semantics” (role tokens like surface/base or action/primary/default, with Light and Dark modes). Components are bound to Semantics wherever possible, so switching a frame's mode re-themes everything."],
    ["2 · Insert components from Assets",
      "Every component lives on its own page as a published component set. Drop an instance, then use the right-hand Properties panel to switch its state (default / hover / focus / active / disabled), tone, or size — and to edit text and toggle icons via component properties. Never detach or restyle an instance by hand: pick the variant instead."],
    ["3 · Elevation is an effect style",
      "Shadow tokens ship as local effect styles under “Arkitype / Elevation” (Light and Dark sets). Components that cast shadows reference those styles — apply the style to your own frames instead of copying shadow values, and re-syncs will keep depth consistent everywhere."],
    ["4 · Read the sheets",
      "Each component ships with a sheet: what it is, when to use it, do / don't guidance, its accessibility contract, and the exact tokens each part is bound to. The variant grid shows every state × option combination, labelled by row and column."],
    ["5 · Updating the system",
      "When the source system changes in Arkitype, export a fresh bundle and run this plugin again. Variables update in place (same IDs — nothing re-links), component variants are redrawn inside the same component sets (instances keep their overrides), and the Changelog page records each sync."],
  ];
  for (const [title, body] of sections) {
    const block = stackFrame(card, title, "VERTICAL", 8, 0);
    await docText(block, title, 18, "Semi Bold", DOC.ink);
    await docText(block, body, 13, "Regular", DOC.inkMuted, { width: 820 });
  }
}

/* ── foundations pages ── */

function primitiveVars(bundle: any, prefix: string): any[] {
  const coll = (bundle.collections || []).find((c: any) => c.name.includes("Primitives"));
  if (!coll) return [];
  return (coll.variables || []).filter((v: any) => v.name.startsWith(prefix));
}

function semanticVarsOf(bundle: any): any[] {
  const coll = (bundle.collections || []).find((c: any) => c.name.includes("Semantics"));
  return coll ? (coll.variables || []) : [];
}

async function buildColourPage(page: PageNode, bundle: any, figmaVarsMap: Map<string, Variable>) {
  clearOwnedContent(page);
  await docPageHeader(page, "Colour", "Primitive ramps feed the semantic roles below. Bind to a role (Semantics) unless a surface genuinely needs a fixed ramp step.");

  let y = 280;
  /* Ramps, grouped by family in bundle order */
  const colorVars = primitiveVars(bundle, "color/");
  const families: string[] = [];
  colorVars.forEach((v: any) => {
    const fam = v.name.split("/")[1];
    if (families.indexOf(fam) === -1) families.push(fam);
  });

  for (const fam of families) {
    const card = docCard(page, `Ramp · ${fam}`, 100, y);
    await docText(card, fam, 20, "Semi Bold", DOC.ink);
    const row = stackFrame(card, "swatches", "HORIZONTAL", 12, 0);
    for (const v of colorVars.filter((cv: any) => cv.name.split("/")[1] === fam)) {
      const step = v.name.split("/")[2];
      const cell = stackFrame(row, step, "VERTICAL", 6, 0);
      const swatch = figma.createFrame();
      swatch.name = v.name;
      swatch.resize(88, 64);
      swatch.cornerRadius = 10;
      swatch.strokes = [{ type: "SOLID", color: DOC.line }];
      swatch.strokeWeight = 1;
      const fVar = figmaVarsMap.get(`Primitives/${v.name}`);
      swatch.fills = fVar
        ? [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } }, "color", fVar)]
        : [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } }];
      cell.appendChild(swatch);
      await docText(cell, step, 11, "Semi Bold", DOC.ink);
      const hex = v.resolvedValuesByMode ? v.resolvedValuesByMode[VALUE_MODE] : "";
      if (hex) await docText(cell, String(hex).toUpperCase(), 10, "Regular", DOC.inkFaint, { mono: true });
    }
    y += (card.height || 200) + 48;
  }

  /* Semantic roles table */
  const rolesCard = docCard(page, "Semantic roles", 100, y);
  await docText(rolesCard, "Semantic roles", 20, "Semi Bold", DOC.ink);
  await docText(rolesCard, "Light and Dark values per role. Swatches are bound to the Semantics variable — they follow the mode of the frame they sit in.", 12, "Regular", DOC.inkMuted, { width: 720 });
  for (const v of semanticVarsOf(bundle)) {
    const rowF = stackFrame(rolesCard, v.name, "HORIZONTAL", 16, 0);
    rowF.counterAxisAlignItems = "CENTER";
    const sw = figma.createFrame();
    sw.resize(44, 26);
    sw.cornerRadius = 6;
    sw.strokes = [{ type: "SOLID", color: DOC.line }];
    sw.strokeWeight = 1;
    const fVar = figmaVarsMap.get(`Semantics/${v.name}`);
    sw.fills = fVar
      ? [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } }, "color", fVar)]
      : [];
    rowF.appendChild(sw);
    const nameText = await docText(rowF, v.name, 12, "Medium", DOC.ink, { mono: true });
    nameText.resize(300, nameText.height);
    const lightHex = v.resolvedValuesByMode ? v.resolvedValuesByMode[LIGHT_MODE] : "";
    const darkHex = v.resolvedValuesByMode ? v.resolvedValuesByMode[DARK_MODE] : "";
    await docText(rowF, `light ${String(lightHex || "—").toUpperCase()}   dark ${String(darkHex || "—").toUpperCase()}`, 11, "Regular", DOC.inkFaint, { mono: true });
  }
}

async function buildTypographyPage(page: PageNode, bundle: any) {
  clearOwnedContent(page);
  await docPageHeader(page, "Typography", "The modular type scale, weights, and font roles. Text styles in components bind their size and weight to these variables.");

  const rolesCard = docCard(page, "Font roles", 100, 260);
  await docText(rolesCard, "Font roles", 20, "Semi Bold", DOC.ink);
  for (const role of ["display", "heading", "body", "mono"]) {
    const fam = bundleVarValue(bundle, `font/${role}`);
    if (!fam) continue;
    const row = stackFrame(rolesCard, role, "HORIZONTAL", 16, 0);
    row.counterAxisAlignItems = "CENTER";
    const label = await docText(row, `font/${role}`, 12, "Medium", DOC.inkMuted, { mono: true });
    label.resize(180, label.height);
    const sample = figma.createText();
    sample.fontName = await loadFontSafe(String(fam), "Regular");
    sample.characters = `${fam} — Ag 019`;
    sample.fontSize = 18;
    sample.fills = [{ type: "SOLID", color: DOC.ink }];
    row.appendChild(sample);
  }

  const scaleCard = docCard(page, "Type scale", 100, 260 + rolesCard.height + 48);
  await docText(scaleCard, "Type scale", 20, "Semi Bold", DOC.ink);
  const sizeVars = primitiveVars(bundle, "type/size/");
  const weightOf = (step: string): number => Number(bundleVarValue(bundle, `type/weight/${step}`)) || 400;
  const leadingOf = (step: string): number => Number(bundleVarValue(bundle, `type/leading/${step}`)) || 0;
  const styleForWeight = (w: number): string => (w >= 700 ? "Bold" : w >= 600 ? "Semi Bold" : w >= 500 ? "Medium" : "Regular");
  for (const v of sizeVars) {
    const step = v.name.split("/")[2];
    const size = Number(v.valuesByMode[VALUE_MODE]) || 14;
    const row = stackFrame(scaleCard, step, "HORIZONTAL", 24, 0);
    row.counterAxisAlignItems = "CENTER";
    const meta = await docText(row, `${step}\n${size}px / ${leadingOf(step)}px · ${weightOf(step)}`, 11, "Regular", DOC.inkMuted, { mono: true });
    meta.resize(150, meta.height);
    const spec = figma.createText();
    spec.fontName = await loadFontSafe(FONTS.heading, styleForWeight(weightOf(step)));
    spec.characters = "Design is thinking made visual";
    spec.fontSize = Math.min(size, 64);
    spec.fills = [{ type: "SOLID", color: DOC.ink }];
    row.appendChild(spec);
  }
}

async function buildSpacePage(page: PageNode, bundle: any, figmaVarsMap: Map<string, Variable>) {
  clearOwnedContent(page);
  await docPageHeader(page, "Space & Layout", "The spacing scale drives every gap and padding binding in the kit. Breakpoints document the responsive contract for engineering.");

  const spaceCard = docCard(page, "Spacing scale", 100, 260);
  await docText(spaceCard, "Spacing scale", 20, "Semi Bold", DOC.ink);
  for (const v of primitiveVars(bundle, "space/")) {
    const px = Number(v.valuesByMode[VALUE_MODE]) || 0;
    const row = stackFrame(spaceCard, v.name, "HORIZONTAL", 16, 0);
    row.counterAxisAlignItems = "CENTER";
    const label = await docText(row, `${v.name}  ·  ${px}px`, 12, "Medium", DOC.inkMuted, { mono: true });
    label.resize(170, label.height);
    const bar = figma.createFrame();
    bar.resize(Math.max(2, Math.min(px * 3, 480)), 14);
    bar.cornerRadius = 4;
    bar.fills = [{ type: "SOLID", color: DOC.accent }];
    row.appendChild(bar);
  }

  const bpVars = primitiveVars(bundle, "layout/breakpoint/");
  if (bpVars.length > 0) {
    const bpCard = docCard(page, "Breakpoints", 100, 260 + spaceCard.height + 48);
    await docText(bpCard, "Breakpoints", 20, "Semi Bold", DOC.ink);
    for (const v of bpVars) {
      await docText(bpCard, `${v.name.split("/")[2]}  →  ${v.valuesByMode[VALUE_MODE]}px`, 13, "Regular", DOC.inkMuted, { mono: true });
    }
  }
}

/* ── elevation effect styles ──
 * Shadow tokens become shared local effect styles ("Arkitype / Elevation /
 * Light / low" …) so elevation is applied as a style reference, not a baked
 * per-node effect (and certainly not a fake layer under the component).
 * Idempotent: re-syncs update the same styles by name. */
const ELEVATION_STYLES = new Map<string, EffectStyle>();

function ensureElevationStyles(bundle: any): void {
  ELEVATION_STYLES.clear();
  const existing = figma.getLocalEffectStyles();
  for (const mode of ["light", "dark"]) {
    for (const v of primitiveVars(bundle, `shadow/${mode}/`)) {
      const level = v.name.split("/")[2];
      const styleName = `Arkitype / Elevation / ${mode === "light" ? "Light" : "Dark"} / ${level}`;
      let style = existing.find((s) => s.name === styleName);
      if (!style) {
        style = figma.createEffectStyle();
        style.name = styleName;
        log(`Created effect style '${styleName}'`, "success");
      }
      try {
        style.effects = parseShadowEffects(String(v.valuesByMode[VALUE_MODE] || ""));
        style.description = `Arkitype elevation '${level}' (${mode} mode). Managed by Arkitype — re-syncs update this style in place.`;
      } catch (e: any) {
        log(`Effect style '${styleName}': ${e.message}`, "warning");
      }
      ELEVATION_STYLES.set(`${mode}/${level}`, style);
    }
  }
}

/** Apply an elevation level to a node via the shared effect style. */
function applyElevation(node: SceneNode & BlendMixin, level: string): void {
  const style = ELEVATION_STYLES.get(`light/${level}`);
  if (!style) return;
  try {
    (node as any).effectStyleId = style.id;
  } catch (e) {
    try { node.effects = style.effects.slice(); } catch (e2) { /* no-op */ }
  }
}

/** Best-effort parse of a CSS box-shadow list into Figma drop shadows. */
function parseShadowEffects(css: string): DropShadowEffect[] {
  const effects: DropShadowEffect[] = [];
  const re = /(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?\s+rgba?\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const parts = m[5].split(",").map(s => parseFloat(s.trim()));
    effects.push({
      type: "DROP_SHADOW",
      offset: { x: parseFloat(m[1]), y: parseFloat(m[2]) },
      radius: parseFloat(m[3]),
      spread: m[4] ? parseFloat(m[4]) : 0,
      color: { r: (parts[0] || 0) / 255, g: (parts[1] || 0) / 255, b: (parts[2] || 0) / 255, a: parts.length > 3 ? parts[3] : 1 },
      visible: true,
      blendMode: "NORMAL",
    });
  }
  return effects;
}

async function buildShapePage(page: PageNode, bundle: any, figmaVarsMap: Map<string, Variable>) {
  clearOwnedContent(page);
  await docPageHeader(page, "Shape & Elevation", "Corner radii and the per-mode shadow scale. Radius tiles are bound to the radius variables.");

  const radiusCard = docCard(page, "Radius scale", 100, 260);
  await docText(radiusCard, "Radius scale", 20, "Semi Bold", DOC.ink);
  const radiusRow = stackFrame(radiusCard, "tiles", "HORIZONTAL", 20, 0);
  for (const v of primitiveVars(bundle, "radius/")) {
    const cell = stackFrame(radiusRow, v.name, "VERTICAL", 8, 0);
    cell.counterAxisAlignItems = "CENTER";
    const tile = figma.createFrame();
    tile.resize(96, 64);
    tile.fills = [{ type: "SOLID", color: DOC.panel }];
    tile.strokes = [{ type: "SOLID", color: DOC.accent }];
    tile.strokeWeight = 1.5;
    const fVar = figmaVarsMap.get(`Primitives/${v.name}`);
    if (fVar) {
      tile.setBoundVariable("topLeftRadius", fVar);
      tile.setBoundVariable("topRightRadius", fVar);
      tile.setBoundVariable("bottomLeftRadius", fVar);
      tile.setBoundVariable("bottomRightRadius", fVar);
    } else {
      tile.cornerRadius = Number(v.valuesByMode[VALUE_MODE]) || 0;
    }
    cell.appendChild(tile);
    await docText(cell, `${v.name.split("/")[1]} · ${v.valuesByMode[VALUE_MODE]}px`, 11, "Medium", DOC.inkMuted, { mono: true });
  }

  const shadowCard = docCard(page, "Elevation", 100, 260 + radiusCard.height + 48);
  await docText(shadowCard, "Elevation (light mode)", 20, "Semi Bold", DOC.ink);
  const shadowRow = stackFrame(shadowCard, "cards", "HORIZONTAL", 32, 0);
  for (const v of primitiveVars(bundle, "shadow/light/")) {
    const cell = stackFrame(shadowRow, v.name, "VERTICAL", 10, 0);
    cell.counterAxisAlignItems = "CENTER";
    const card = figma.createFrame();
    card.resize(140, 90);
    card.cornerRadius = 12;
    card.fills = [{ type: "SOLID", color: DOC.card }];
    const level = v.name.split("/")[2];
    if (ELEVATION_STYLES.has(`light/${level}`)) {
      applyElevation(card, level);
    } else {
      const fx = parseShadowEffects(String(v.valuesByMode[VALUE_MODE] || ""));
      if (fx.length > 0) card.effects = fx;
    }
    if ((card.effects || []).length === 0) {
      card.strokes = [{ type: "SOLID", color: DOC.line }];
      card.strokeWeight = 1;
    }
    cell.appendChild(card);
    await docText(cell, level, 11, "Medium", DOC.inkMuted, { mono: true });
  }
  await docText(shadowCard, "Each level is a local effect style — Arkitype / Elevation / Light|Dark / <level>. Apply the style; don't hand-copy shadow values.", 12, "Medium", DOC.inkMuted, { width: 720 });
  const darkShadows = primitiveVars(bundle, "shadow/dark/");
  if (darkShadows.length > 0) {
    for (const v of darkShadows) {
      await docText(shadowCard, `dark/${v.name.split("/")[2]}  ·  ${v.valuesByMode[VALUE_MODE]}`, 10.5, "Regular", DOC.inkFaint, { mono: true, width: 820 });
    }
  }
}

async function buildMotionPage(page: PageNode, bundle: any) {
  clearOwnedContent(page);
  await docPageHeader(page, "Motion", "Durations and easing curves. Use the shortest duration that still reads as motion; reserve the longest for full-surface transitions.");

  const durCard = docCard(page, "Durations", 100, 260);
  await docText(durCard, "Durations", 20, "Semi Bold", DOC.ink);
  for (const v of primitiveVars(bundle, "motion/duration/")) {
    const ms = Number(v.valuesByMode[VALUE_MODE]) || 0;
    const row = stackFrame(durCard, v.name, "HORIZONTAL", 16, 0);
    row.counterAxisAlignItems = "CENTER";
    const label = await docText(row, `${v.name.split("/")[2]}  ·  ${ms}ms`, 12, "Medium", DOC.inkMuted, { mono: true });
    label.resize(170, label.height);
    const bar = figma.createFrame();
    bar.resize(Math.max(4, Math.min(ms, 600)), 10);
    bar.cornerRadius = 4;
    bar.fills = [{ type: "SOLID", color: DOC.accent }];
    row.appendChild(bar);
  }

  const easeVars = primitiveVars(bundle, "motion/easing/");
  if (easeVars.length > 0) {
    const easeCard = docCard(page, "Easings", 100, 260 + durCard.height + 48);
    await docText(easeCard, "Easings", 20, "Semi Bold", DOC.ink);
    for (const v of easeVars) {
      await docText(easeCard, `${v.name.split("/")[2]}  ·  ${v.valuesByMode[VALUE_MODE]}`, 12, "Regular", DOC.inkMuted, { mono: true });
    }
  }
}

/* ── component lane pages ── */

async function buildLaneHeader(page: PageNode, lane: any, y: number): Promise<number> {
  const old = page.children.find(c => c.getPluginData(OWNED_KEY) === "1" && c.name === "Lane header");
  if (old) old.remove();
  const header = stackFrame(page, "Lane header", "VERTICAL", 10, 0);
  header.setPluginData(OWNED_KEY, "1");
  header.x = 100; header.y = y;
  if (lane.laneLabel) {
    await docText(header, `COMPONENTS · ${String(lane.laneLabel).toUpperCase()}`, 11, "Bold", DOC.inkFaint, { letterSpacing: 10 });
  }
  await docText(header, lane.label, 40, "Bold", DOC.ink);
  if (lane.note) await docText(header, lane.note, 14, "Regular", DOC.inkMuted, { width: 820 });
  return y + header.height + 72;
}

/** Index every Arkitype component set/component in the document. */
function collectExistingComponents(): Map<string, ComponentSetNode | ComponentNode> {
  const map = new Map<string, ComponentSetNode | ComponentNode>();
  const nodes = figma.root.findAll(n =>
    (n.type === "COMPONENT_SET" || n.type === "COMPONENT") &&
    !(n.parent && n.parent.type === "COMPONENT_SET")
  ) as Array<ComponentSetNode | ComponentNode>;
  for (const n of nodes) {
    const tagged = n.getPluginData(COMP_KEY);
    if (tagged) {
      map.set(tagged, n);
    } else if (n.name.startsWith("Arkitype / ")) {
      // Legacy naming from the pre-pages exporter
      const legacy = n.name.slice("Arkitype / ".length).toLowerCase();
      if (!map.has(legacy)) map.set(legacy, n);
    }
  }
  return map;
}

/** Per-component grid cell sizing (generous, prevents overlaps). */
function cellSizeFor(compId: string): { w: number; h: number } {
  if (["modal", "card", "table", "navbar", "emptyState"].indexOf(compId) !== -1) return { w: 380, h: 280 };
  if (compId === "sidebar") return { w: 240, h: 300 };
  if (["alert", "toast", "banner", "listItem", "feedItem", "input", "textarea", "select", "searchField", "datePicker", "statGrid", "buttonGroup"].indexOf(compId) !== -1) return { w: 300, h: 120 };
  if (compId === "codeBlock") return { w: 280, h: 140 };
  if (["fileUpload", "popover"].indexOf(compId) !== -1) return { w: 320, h: 180 };
  if (["timeline", "tree"].indexOf(compId) !== -1) return { w: 300, h: 240 };
  return { w: 240, h: 100 };
}

interface BuiltSet {
  node: ComponentSetNode | ComponentNode;
  states: string[];
  optionCombos: string[];
  cellW: number;
  cellH: number;
}

/** Create or update the actual component set for one component. */
async function buildComponentSet(
  page: PageNode,
  comp: any,
  figmaVarsMap: Map<string, Variable>,
  existingSets: Map<string, ComponentSetNode | ComponentNode>
): Promise<BuiltSet> {
  const existing = existingSets.get(comp.id) || null;
  let compSet: ComponentSetNode | null = existing && existing.type === "COMPONENT_SET" ? existing : null;
  let compNode: ComponentNode | null = existing && existing.type === "COMPONENT" ? existing : null;

  const states = Array.from(new Set(comp.variants.map((v: any) => v.properties.state || "default"))) as string[];
  const nonStates = Object.keys(comp.variants[0].properties).filter(k => k !== "state");
  const optionCombos = Array.from(new Set(comp.variants.map((v: any) =>
    nonStates.map(k => `${k}=${v.properties[k]}`).join(",")
  ))) as string[];

  const { w: cellW, h: cellH } = cellSizeFor(comp.id);
  const variantNodes: ComponentNode[] = [];

  for (const variantData of comp.variants) {
    const comboProps = variantData.properties;
    const comboState = comboProps.state || "default";
    const optionComboString = nonStates.map(k => `${k}=${comboProps[k]}`).join(",");
    const rowIndex = optionCombos.indexOf(optionComboString);
    const colIndex = states.indexOf(comboState);
    const figmaVariantName = Object.entries(comboProps).map(([k, v]) => `${k}=${v}`).join(", ");

    let variantNode: ComponentNode | null = null;
    if (compSet) {
      variantNode = compSet.children.find(child => {
        if (child.type !== "COMPONENT") return false;
        const props = child.variantProperties;
        return props && Object.entries(comboProps).every(([k, v]) => props[k] === v);
      }) as ComponentNode | null;
    } else if (compNode) {
      variantNode = compNode;
    }
    if (!variantNode) {
      variantNode = figma.createComponent();
    }
    variantNode.name = figmaVariantName;
    variantNode.x = colIndex * cellW + 40;
    variantNode.y = rowIndex * cellH + 40;

    await drawComponentNode(variantNode, comp.id, variantData, figmaVarsMap);
    variantNodes.push(variantNode);
  }

  let maxW = 0, maxH = 0;
  for (const n of variantNodes) {
    if (n.width > maxW) maxW = n.width;
    if (n.height > maxH) maxH = n.height;
  }
  const gridW = (states.length - 1) * cellW + maxW + 80;
  const gridH = (optionCombos.length - 1) * cellH + maxH + 80;

  let resultNode: ComponentSetNode | ComponentNode;
  if (!compSet && !compNode) {
    if (variantNodes.length > 1) {
      const temp = figma.createFrame();
      temp.fills = [];
      page.appendChild(temp);
      variantNodes.forEach(n => temp.appendChild(n));
      compSet = figma.combineAsVariants(variantNodes, temp);
      // combineAsVariants re-parents the components; lift the set out and drop the shell.
      page.appendChild(compSet);
      temp.remove();
      resultNode = compSet;
      log(`Created component set '${comp.name}'`, "success");
    } else {
      resultNode = variantNodes[0];
      variantNodes[0].name = comp.name;
      page.appendChild(variantNodes[0]);
      log(`Created component '${comp.name}'`, "success");
    }
  } else if (compSet) {
    // Adopt any newly created variants; drop variants whose combo no longer exists.
    variantNodes.forEach(n => {
      if (n.parent !== compSet) compSet!.appendChild(n);
    });
    [...compSet.children].forEach(child => {
      if (child.type === "COMPONENT" && variantNodes.indexOf(child) === -1) {
        log(`Removing stale variant '${child.name}' from '${comp.name}'`, "warning");
        child.remove();
      }
    });
    resultNode = compSet;
    log(`Updated component set '${comp.name}' in place`, "success");
  } else {
    resultNode = compNode!;
    log(`Updated component '${comp.name}' in place`, "success");
  }

  if (resultNode.type === "COMPONENT_SET") {
    resultNode.name = comp.name;
    resultNode.layoutMode = "NONE";
    resultNode.fills = [];
    resultNode.strokes = [];
    resultNode.clipsContent = false;
    resultNode.resize(gridW, gridH);
  }
  resultNode.description = `${comp.description}\n\nSee the “${comp.name} — Sheet” frame for usage guidance and token bindings. Managed by Arkitype — re-syncs update this ${resultNode.type === "COMPONENT_SET" ? "set" : "component"} in place.`;
  resultNode.setPluginData(COMP_KEY, comp.id);
  existingSets.set(comp.id, resultNode);

  return { node: resultNode, states, optionCombos, cellW, cellH };
}

/** Ensure Figma component properties (TEXT/BOOLEAN) exist and are wired to layers. */
async function applyComponentProperties(node: ComponentSetNode | ComponentNode, props: any[]) {
  if (!props || props.length === 0) return;
  for (const p of props) {
    let key: string | undefined;
    try {
      const defs = node.componentPropertyDefinitions;
      key = Object.keys(defs).find(k => k.split("#")[0] === p.name);
      if (!key) {
        key = node.addComponentProperty(p.name, p.type, p.defaultValue);
      } else {
        node.editComponentProperty(key, { defaultValue: p.defaultValue });
      }
    } catch (e: any) {
      log(`Property '${p.name}' on '${node.name}': ${e.message}`, "warning");
      continue;
    }
    const variants: ComponentNode[] =
      node.type === "COMPONENT_SET"
        ? (node.children.filter(c => c.type === "COMPONENT") as ComponentNode[])
        : [node];
    for (const variant of variants) {
      const targets = variant.findAll(n => n.name === p.layer);
      for (const target of targets) {
        try {
          if (p.type === "TEXT" && target.type === "TEXT") {
            target.componentPropertyReferences = { ...(target.componentPropertyReferences || {}), characters: key };
          } else if (p.type === "BOOLEAN") {
            (target as SceneNode).visible = !!p.defaultValue;
            target.componentPropertyReferences = { ...(target.componentPropertyReferences || {}), visible: key };
          }
        } catch (e: any) {
          log(`Wiring '${p.name}' → layer '${p.layer}': ${e.message}`, "warning");
        }
      }
    }
  }
}

/** One component's full sheet: docs, labelled variant matrix, spec table. */
async function buildComponentSection(
  page: PageNode,
  comp: any,
  figmaVarsMap: Map<string, Variable>,
  y: number,
  existingSets: Map<string, ComponentSetNode | ComponentNode>
): Promise<number> {
  /* Rescue the live component set from the old sheet before rebuilding it. */
  const oldSections = figma.root.findAll(n => n.getPluginData(SECTION_KEY) === comp.id);
  const liveSet = existingSets.get(comp.id);
  if (liveSet && oldSections.some(s => isAncestorOf(s, liveSet))) {
    page.appendChild(liveSet);
  }
  oldSections.forEach(s => s.remove());

  const docs = comp.docs || {};

  const section = stackFrame(page, `${comp.name} — Sheet`, "VERTICAL", 36, 56);
  section.setPluginData(SECTION_KEY, comp.id);
  section.setPluginData(OWNED_KEY, "1");
  section.x = 100; section.y = y;
  section.fills = [{ type: "SOLID", color: DOC.card }];
  section.cornerRadius = 24;
  section.strokes = [{ type: "SOLID", color: DOC.line }];
  section.strokeWeight = 1;

  /* Header row: name + chips */
  const headerRow = stackFrame(section, "header", "HORIZONTAL", 14, 0);
  headerRow.counterAxisAlignItems = "CENTER";
  await docText(headerRow, comp.name, 30, "Bold", DOC.ink, { name: "title" });
  await docChip(headerRow, comp.laneLabel || "Component", DOC.inkMuted);
  await docChip(headerRow, `Tier ${comp.tier || 1}`, DOC.inkMuted);

  await docText(section, docs.description || comp.description || "", 14, "Regular", DOC.inkMuted, { width: 880, name: "description" });

  /* Usage guidance: When to use / Do / Don't */
  const usageRow = stackFrame(section, "usage", "HORIZONTAL", 20, 0);
  const usageCol = async (title: string, items: string[], color: RGB, mark: string) => {
    const col = stackFrame(usageRow, title, "VERTICAL", 10, 20);
    col.fills = [{ type: "SOLID", color: DOC.panel }];
    col.cornerRadius = 14;
    col.counterAxisSizingMode = "FIXED";
    col.resize(300, col.height);
    await docText(col, title.toUpperCase(), 10, "Bold", color, { letterSpacing: 8 });
    for (const item of items || []) {
      await docText(col, `${mark}  ${item}`, 12, "Regular", DOC.inkMuted, { width: 260 });
    }
  };
  await usageCol("When to use", docs.whenToUse || [], DOC.inkMuted, "•");
  await usageCol("Do", docs.dos || [], DOC.green, "✓");
  await usageCol("Don't", docs.donts || [], DOC.red, "✕");
  if (docs.a11y) {
    await docText(section, `Accessibility — ${docs.a11y}`, 12, "Regular", DOC.inkFaint, { width: 880, name: "a11y" });
  }

  /* Variant matrix with row/column labels */
  await docText(section, "VARIANTS & STATES", 11, "Bold", DOC.inkFaint, { letterSpacing: 10 });
  const built = await buildComponentSet(page, comp, figmaVarsMap, existingSets);

  const rowLabelW = built.optionCombos.length > 1 || built.optionCombos[0] !== "" ? 150 : 0;
  const colLabelH = 34;
  const matrix = figma.createFrame();
  matrix.name = "matrix";
  matrix.layoutMode = "NONE";
  matrix.fills = [];
  matrix.clipsContent = false;
  section.appendChild(matrix);
  matrix.resize(rowLabelW + built.node.width, colLabelH + built.node.height);

  for (let i = 0; i < built.states.length; i++) {
    const label = figma.createText();
    label.fontName = await loadFontSafe("Inter", "Semi Bold");
    label.characters = built.states[i].toUpperCase();
    label.fontSize = 10;
    label.letterSpacing = { value: 8, unit: "PERCENT" };
    label.fills = [{ type: "SOLID", color: DOC.inkFaint }];
    matrix.appendChild(label);
    label.x = rowLabelW + i * built.cellW + 40;
    label.y = 8;
  }
  if (rowLabelW > 0) {
    for (let j = 0; j < built.optionCombos.length; j++) {
      const combo = built.optionCombos[j];
      const pretty = combo === "" ? "—" : combo.split(",").map(kv => kv.split("=")[1]).join(" · ");
      const label = figma.createText();
      label.fontName = await loadFontSafe("Inter", "Medium");
      label.characters = pretty;
      label.fontSize = 11;
      label.fills = [{ type: "SOLID", color: DOC.inkMuted }];
      matrix.appendChild(label);
      label.x = 0;
      label.y = colLabelH + j * built.cellH + 40;
      if (label.width > rowLabelW - 12) label.resize(rowLabelW - 12, label.height);
    }
  }
  matrix.appendChild(built.node);
  built.node.x = rowLabelW;
  built.node.y = colLabelH;

  /* Component properties (properties-panel controls) */
  await applyComponentProperties(built.node, comp.properties || []);

  /* Icon slots → INSTANCE_SWAP properties, so icons are picked from the
   * Properties panel exactly like the design-system's Icons page/variants. */
  await applyIconSwapProperties(built.node);

  /* Spec table: properties + token bindings */
  const specRow = stackFrame(section, "spec", "HORIZONTAL", 20, 0);
  const propsCol = stackFrame(specRow, "Properties", "VERTICAL", 8, 20);
  propsCol.fills = [{ type: "SOLID", color: DOC.panel }];
  propsCol.cornerRadius = 14;
  await docText(propsCol, "PROPERTIES", 10, "Bold", DOC.inkFaint, { letterSpacing: 8 });
  const axes = Object.keys(comp.variants[0].properties);
  for (const axis of axes) {
    const values = Array.from(new Set(comp.variants.map((v: any) => v.properties[axis]))) as string[];
    await docText(propsCol, `${axis}  ·  variant  ·  ${values.join(" / ")}`, 11.5, "Regular", DOC.inkMuted, { mono: true, width: 380 });
  }
  for (const p of comp.properties || []) {
    const def = typeof p.defaultValue === "boolean" ? (p.defaultValue ? "on" : "off") : `"${p.defaultValue}"`;
    await docText(propsCol, `${p.name}  ·  ${p.type.toLowerCase()}  ·  default ${def}`, 11.5, "Regular", DOC.inkMuted, { mono: true, width: 380 });
  }

  const tokensCol = stackFrame(specRow, "Tokens", "VERTICAL", 8, 20);
  tokensCol.fills = [{ type: "SOLID", color: DOC.panel }];
  tokensCol.cornerRadius = 14;
  await docText(tokensCol, "TOKEN BINDINGS", 10, "Bold", DOC.inkFaint, { letterSpacing: 8 });
  const sample = comp.variants[0];
  const bindings: string[] = [];
  if (sample && sample.styles) {
    Object.entries(sample.styles).forEach(([propKey, styleVal]: [string, any]) => {
      if (styleVal && styleVal.type === "ALIAS") {
        bindings.push(`${propKey}  →  ${styleVal.collection}/${styleVal.path}`);
      }
    });
  }
  const shown = bindings.slice(0, 14);
  for (const b of shown) {
    await docText(tokensCol, b, 11.5, "Regular", DOC.inkMuted, { mono: true, width: 420 });
  }
  if (bindings.length > shown.length) {
    await docText(tokensCol, `+ ${bindings.length - shown.length} more bindings`, 11, "Regular", DOC.inkFaint);
  }
  if (bindings.length === 0) {
    await docText(tokensCol, "No aliased bindings — literal values only.", 11.5, "Regular", DOC.inkFaint);
  }

  return y + section.height + 96;
}

function isAncestorOf(candidate: BaseNode, node: BaseNode): boolean {
  let p: BaseNode | null = node.parent;
  while (p) {
    if (p.id === candidate.id) return true;
    p = p.parent;
  }
  return false;
}

/* ── changelog ── */

async function appendChangelogEntry(page: PageNode, bundle: any) {
  let list = page.children.find(c => c.getPluginData(OWNED_KEY) === "1" && c.name === "Sync History") as FrameNode | undefined;
  if (!list) {
    list = docCard(page, "Sync History", 100, 100);
    await docText(list, "Sync History", 24, "Bold", DOC.ink);
    await docText(list, "One entry per plugin sync — newest first. Variables and components update in place, so instances survive every entry below.", 12, "Regular", DOC.inkMuted, { width: 640 });
  }
  const entry = stackFrame(null, "entry", "HORIZONTAL", 24, 12);
  entry.counterAxisAlignItems = "CENTER";
  entry.fills = [{ type: "SOLID", color: DOC.panel }];
  entry.cornerRadius = 10;
  const now = new Date();
  await docText(entry, now.toISOString().replace("T", " ").slice(0, 16), 12, "Medium", DOC.ink, { mono: true });
  await docText(entry, `v${(bundle.meta && bundle.meta.version) || "?"}`, 12, "Regular", DOC.inkMuted, { mono: true });
  await docText(entry, `${(bundle.meta && bundle.meta.tokenCount) || "—"} tokens`, 12, "Regular", DOC.inkMuted);
  await docText(entry, `${(bundle.components || []).length} components`, 12, "Regular", DOC.inkMuted);
  // Insert newest entry right below the intro texts (index 2)
  list.insertChild(Math.min(2, list.children.length), entry);
}

// Load fonts needed for the TextNodes
async function loadStandardFonts() {
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    await figma.loadFontAsync({ family: "Courier New", style: "Regular" });
  } catch (err) {
    log(`Warning loading standard fonts: ${err}`, "warning");
  }
}

// Safely load fonts, catching failure and returning actual loaded font
async function loadFontSafe(family: string, style: string): Promise<{ family: string; style: string }> {
  try {
    await figma.loadFontAsync({ family, style });
    return { family, style };
  } catch (e) {
    try {
      await figma.loadFontAsync({ family: "Inter", style });
      return { family: "Inter", style };
    } catch (e2) {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      return { family: "Inter", style: "Regular" };
    }
  }
}

// Hex converter for Figma {r, g, b} scale (0 to 1)
function hexToFigmaRgb(hex: string): RGB {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2];
  }
  
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  
  return { r, g, b };
}

/* ── ICON LIBRARY (Material Symbols) ──────────────────────────────────────
 * A dedicated "Icons" page holds one component per ligature, combined into a
 * single "Icon" variant set. Component icon slots place instances of these and
 * expose an INSTANCE_SWAP property, so a designer swaps icons from the panel —
 * the real design-system pattern (icons as a page of variants, swapped in).
 */

/** Load the icon glyph font, degrading gracefully when it isn't installed. */
async function loadIconFont(): Promise<{ font: FontName; glyphs: boolean }> {
  const candidates: FontName[] = [
    { family: "Material Symbols Outlined", style: "Regular" },
    { family: "Material Icons", style: "Regular" },
  ];
  for (const f of candidates) {
    try {
      await figma.loadFontAsync(f);
      return { font: f, glyphs: true };
    } catch (e) { /* try next */ }
  }
  const fallback = await loadFontSafe(FONTS.body, "Regular");
  return { font: fallback, glyphs: false };
}

/** Build/refresh the Icons page: a swappable "Icon" variant set. Idempotent —
 *  icon components are reused by ligature name so instances survive re-syncs. */
async function buildIconLibraryPage(
  bundle: any,
  figmaVarsMap: Map<string, Variable>,
  order: number
): Promise<void> {
  const names: string[] = (bundle.icons && bundle.icons.names) || [];
  if (!names.length) { ICON_LIB = null; return; }

  const page = ensurePage("icons", "🔣  Icons", order);
  const { font, glyphs } = await loadIconFont();

  /* Page header — find-or-create, never via clearOwnedContent (that would wipe
   * the icon set, which is what we must preserve). */
  const oldHeader = page.children.find(c => c.getPluginData("ark:iconHeader") === "1");
  if (oldHeader) oldHeader.remove();
  const header = stackFrame(page, "Icons — header", "VERTICAL", 10, 0);
  header.setPluginData("ark:iconHeader", "1");
  header.x = 100; header.y = 90;
  await docText(header, "Icons", 40, "Bold", DOC.ink);
  await docText(
    header,
    `${bundle.icons.library || "Material Symbols"} · ${names.length} icons. One component per icon, combined as the “Icon” variant set below. Component icon slots reference these as instance-swap properties — select a component, then swap its icon from the Properties panel.` +
      (glyphs ? "" : "  ⚠ The Material Symbols font isn’t installed in this Figma editor, so icons show name placeholders — enable the free font to render glyphs."),
    13, "Regular", DOC.inkMuted, { width: 820 }
  );

  /* Existing set + adopt its variants by their stored ligature. */
  let set = page.children.find(c => c.getPluginData(COMP_KEY) === "__icons__") as ComponentSetNode | undefined;
  const components = new Map<string, ComponentNode>();
  if (set && set.type === "COMPONENT_SET") {
    for (const child of set.children) {
      if (child.type === "COMPONENT") {
        const n = child.getPluginData("ark:icon");
        if (n) components.set(n, child);
      }
    }
  }

  const fresh: ComponentNode[] = [];
  for (const name of names) {
    let comp = components.get(name);
    if (!comp) {
      comp = figma.createComponent();
      comp.setPluginData("ark:icon", name);
      fresh.push(comp);
      components.set(name, comp);
    }
    comp.name = `Name=${name}`;
    comp.description = `Material Symbols · ${name}`;
    comp.layoutMode = "HORIZONTAL";
    comp.primaryAxisAlignItems = "CENTER";
    comp.counterAxisAlignItems = "CENTER";
    comp.primaryAxisSizingMode = "FIXED";
    comp.counterAxisSizingMode = "FIXED";
    comp.resize(24, 24);
    comp.fills = [];
    [...comp.children].forEach(c => c.remove());
    const glyph = figma.createText();
    glyph.name = "glyph";
    glyph.fontName = font;
    glyph.characters = glyphs ? name : name.slice(0, 2);
    glyph.fontSize = glyphs ? 20 : 8;
    glyph.fills = semPaint(figmaVarsMap, "text/primary", { r: 0.1, g: 0.1, b: 0.12 });
    comp.appendChild(glyph);
  }

  /* Drop icons no longer in the library. */
  const nameSet = new Set(names);
  for (const [n, comp] of Array.from(components.entries())) {
    if (!nameSet.has(n)) { comp.remove(); components.delete(n); }
  }

  const ordered = names.map(n => components.get(n)).filter(Boolean) as ComponentNode[];
  try {
    if (!set || set.type !== "COMPONENT_SET") {
      const cols = 24;
      ordered.forEach((c, i) => { c.x = (i % cols) * 40; c.y = 260 + Math.floor(i / cols) * 40; page.appendChild(c); });
      set = figma.combineAsVariants(ordered, page);
    } else {
      fresh.forEach(c => { if (c.parent !== set) set!.appendChild(c); });
    }
    set.name = "Icon";
    set.setPluginData(COMP_KEY, "__icons__");
    set.x = 100; set.y = 240;
    set.layoutMode = "NONE";
    set.clipsContent = false;
  } catch (e: any) {
    log(`Icon set combine skipped: ${e.message}`, "warning");
  }

  const defaultName =
    ["star", "favorite", "circle", "add"].find(n => components.has(n)) || names[0] || null;
  ICON_LIB = { components, defaultName, font, glyphs };
  log(
    `Icon library ready — ${components.size} icons${glyphs ? "" : " (font not installed; placeholders shown)"}.`,
    glyphs ? "success" : "warning"
  );
}

/** The library ligature to use for a slot: the chosen one if it exists, else
 *  the library default. Null when no icon library is available. */
function resolveIconName(name: string | undefined): string | null {
  if (!ICON_LIB) return null;
  if (name && ICON_LIB.components.has(name)) return name;
  return ICON_LIB.defaultName;
}

/** A fresh instance of the icon component for `name` (or the default), tagged so
 *  swap-property wiring can find it. Null when the library is unavailable. */
function makeIconInstance(slotName: string, name: string | undefined): InstanceNode | null {
  const resolved = resolveIconName(name);
  if (!resolved || !ICON_LIB) return null;
  const comp = ICON_LIB.components.get(resolved);
  if (!comp) return null;
  try {
    const inst = comp.createInstance();
    inst.name = slotName;
    inst.setPluginData("ark:iconSlot", slotName);
    return inst;
  } catch (e) {
    return null;
  }
}

/** Expose each icon slot as an INSTANCE_SWAP component property on the set, and
 *  wire every variant's slot instance to it. Fully guarded: on any failure the
 *  export keeps working with plain (still natively-swappable) icon instances. */
async function applyIconSwapProperties(node: ComponentSetNode | ComponentNode): Promise<void> {
  if (!ICON_LIB) return;
  const variants: ComponentNode[] =
    node.type === "COMPONENT_SET"
      ? (node.children.filter(c => c.type === "COMPONENT") as ComponentNode[])
      : [node];

  const slotNames = new Set<string>();
  for (const v of variants) {
    v.findAll(n => n.getPluginData("ark:iconSlot") !== "").forEach(n =>
      slotNames.add(n.getPluginData("ark:iconSlot"))
    );
  }

  const LABELS: Record<string, string> = {
    prefixIcon: "Prefix icon", suffixIcon: "Suffix icon", icon: "Icon",
  };

  for (const slot of Array.from(slotNames)) {
    const label = LABELS[slot] || "Icon";
    let key: string | undefined;
    try {
      const defs = node.componentPropertyDefinitions;
      key = Object.keys(defs).find(k => k.split("#")[0] === label);
      if (!key) {
        const firstInst = variants[0].findOne(
          n => n.getPluginData("ark:iconSlot") === slot
        ) as InstanceNode | null;
        const defId =
          firstInst && firstInst.mainComponent ? firstInst.mainComponent.id : null;
        if (!defId) continue;
        key = node.addComponentProperty(label, "INSTANCE_SWAP", defId);
      }
    } catch (e: any) {
      log(`Icon swap prop '${label}' on '${node.name}': ${e.message}`, "warning");
      continue;
    }
    for (const v of variants) {
      const insts = v.findAll(n => n.getPluginData("ark:iconSlot") === slot);
      for (const inst of insts) {
        try {
          inst.componentPropertyReferences = {
            ...(inst.componentPropertyReferences || {}),
            mainComponent: key,
          };
        } catch (e) { /* leave as native swap */ }
      }
    }
  }
}

/** Tint a paint (LITERAL or ALIAS-resolved) onto a node's `fills`. */
function applyIconColor(
  node: SceneNode & { fills: any },
  colorBinding: any,
  figmaVarsMap: Map<string, Variable>
) {
  if (colorBinding && colorBinding.type === "ALIAS") {
    const fVar = figmaVarsMap.get(`${colorBinding.collection}/${colorBinding.path}`);
    if (fVar) {
      node.fills = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", fVar)];
    }
  } else if (colorBinding && colorBinding.value) {
    node.fills = [{ type: "SOLID", color: hexToFigmaRgb(colorBinding.value.toString()) }];
  }
}

/**
 * Draw one icon slot: an instance of the Material Symbols library component
 * (swappable via the "Icon" variant set / INSTANCE_SWAP property) tinted to
 * the part's colour binding. Falls back to a plain coloured dot frame when the
 * icon library isn't available (older bundle, or the glyph font missing) so a
 * sync never fails over this.
 */
function renderIconSlot(
  parent: FrameNode | ComponentNode,
  slotName: string,
  size: number,
  colorBinding: any,
  iconName: string | undefined,
  figmaVarsMap: Map<string, Variable>
): SceneNode {
  const inst = makeIconInstance(slotName, iconName);
  if (inst) {
    inst.resize(size, size);
    const glyph = inst.findOne(n => n.name === "glyph") as TextNode | null;
    if (glyph) applyIconColor(glyph, colorBinding, figmaVarsMap);
    parent.appendChild(inst);
    return inst;
  }
  // Fallback: coloured dot placeholder (no icon library in this bundle/file).
  const slot = figma.createFrame();
  slot.name = slotName;
  slot.resize(size, size);
  slot.fills = [];
  const dot = figma.createEllipse();
  const inset = Math.max(1, size * 0.15);
  dot.resize(size - inset * 2, size - inset * 2);
  dot.x = inset; dot.y = inset;
  applyIconColor(dot, colorBinding, figmaVarsMap);
  slot.appendChild(dot);
  parent.appendChild(slot);
  return slot;
}

/** Shorthand for a semantic-token alias binding. */
function sem(path: string): { type: "ALIAS"; collection: "Semantics"; path: string } {
  return { type: "ALIAS", collection: "Semantics", path };
}

/** Solid paint bound to a semantic variable, with a literal fallback. */
function semPaint(figmaVarsMap: Map<string, Variable>, path: string, fallback: RGB): Paint[] {
  const fVar = figmaVarsMap.get(`Semantics/${path}`);
  if (fVar) {
    return [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: fallback }, "color", fVar)];
  }
  return [{ type: "SOLID", color: fallback }];
}

/** Bind a text node's fontSize/fontWeight to primitive variables when the
 * component's style bindings alias them (e.g. type/size/sm, font/weight/…). */
function bindTextVars(text: TextNode, styles: any, partPrefix: string, figmaVarsMap: Map<string, Variable>) {
  const sizeB = styles && styles[`${partPrefix}.size`];
  if (sizeB && sizeB.type === "ALIAS") {
    const v = figmaVarsMap.get(`${sizeB.collection}/${sizeB.path}`);
    if (v) { try { text.setBoundVariable("fontSize", v); } catch (e) {} }
  }
  const weightB = styles && styles[`${partPrefix}.weight`];
  if (weightB && weightB.type === "ALIAS") {
    const v = figmaVarsMap.get(`${weightB.collection}/${weightB.path}`);
    if (v) { try { text.setBoundVariable("fontWeight", v); } catch (e) {} }
  }
}

// Helper: Create Text Node
async function createTextHelper(
  parent: FrameNode | ComponentNode,
  name: string,
  characters: string,
  fontSize: number,
  colorBinding: any,
  fontFamily: string = "Inter",
  fontStyle: string = "Regular",
  figmaVarsMap: Map<string, Variable>
): Promise<TextNode> {
  const text = figma.createText();
  text.name = name;

  // Component copy renders in the user's own typefaces (doc chrome stays Inter).
  const resolvedFamily =
    fontFamily === "Inter" ? FONTS.body :
    fontFamily === "Courier New" ? FONTS.mono : fontFamily;
  const loadedFont = await loadFontSafe(resolvedFamily, fontStyle);
  text.fontName = loadedFont;
  text.characters = characters;
  text.fontSize = fontSize;
  
  if (colorBinding) {
    if (colorBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${colorBinding.collection}/${colorBinding.path}`);
      if (fVar) {
        text.fills = [
          figma.variables.setBoundVariableForPaint(
            { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
            'color',
            fVar
          )
        ];
      }
    } else if (colorBinding.value) {
      text.fills = [{ type: 'SOLID', color: hexToFigmaRgb(colorBinding.value.toString()) }];
    }
  } else {
    // No binding supplied — default body text follows the text/primary role.
    text.fills = semPaint(figmaVarsMap, "text/primary", { r: 0.15, g: 0.16, b: 0.19 });
  }
  
  parent.appendChild(text);
  return text;
}

// Helper: Create Layout Frame
async function createFrameHelper(
  parent: FrameNode | ComponentNode | null,
  name: string,
  layoutMode: "HORIZONTAL" | "VERTICAL" | "NONE",
  itemSpacing: any,
  paddingX: any,
  paddingY: any,
  bgBinding: any,
  borderBinding: any,
  borderWidth: number,
  radiusBinding: any,
  figmaVarsMap: Map<string, Variable>
): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = layoutMode;
  
  if (layoutMode !== "NONE") {
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    frame.primaryAxisAlignItems = "CENTER";
    frame.counterAxisAlignItems = "CENTER";
    
    // Spacing
    if (itemSpacing !== undefined && itemSpacing !== null) {
      if (typeof itemSpacing === "object" && itemSpacing.type === "ALIAS") {
        const fVar = figmaVarsMap.get(`${itemSpacing.collection}/${itemSpacing.path}`);
        if (fVar) frame.setBoundVariable('itemSpacing', fVar);
      } else {
        frame.itemSpacing = Number(itemSpacing) || 0;
      }
    }
    
    // Padding
    if (paddingX !== undefined && paddingX !== null) {
      if (typeof paddingX === "object" && paddingX.type === "ALIAS") {
        const fVar = figmaVarsMap.get(`${paddingX.collection}/${paddingX.path}`);
        if (fVar) {
          frame.setBoundVariable('paddingLeft', fVar);
          frame.setBoundVariable('paddingRight', fVar);
        }
      } else {
        frame.paddingLeft = Number(paddingX) || 0;
        frame.paddingRight = Number(paddingX) || 0;
      }
    }
    
    if (paddingY !== undefined && paddingY !== null) {
      if (typeof paddingY === "object" && paddingY.type === "ALIAS") {
        const fVar = figmaVarsMap.get(`${paddingY.collection}/${paddingY.path}`);
        if (fVar) {
          frame.setBoundVariable('paddingTop', fVar);
          frame.setBoundVariable('paddingBottom', fVar);
        }
      } else {
        frame.paddingTop = Number(paddingY) || 0;
        frame.paddingBottom = Number(paddingY) || 0;
      }
    }
  }
  
  // Background
  if (bgBinding) {
    if (bgBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${bgBinding.collection}/${bgBinding.path}`);
      if (fVar) {
        frame.fills = [
          figma.variables.setBoundVariableForPaint(
            { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
            'color',
            fVar
          )
        ];
      }
    } else if (bgBinding.value && bgBinding.value !== "transparent") {
      frame.fills = [{ type: 'SOLID', color: hexToFigmaRgb(bgBinding.value.toString()) }];
    } else {
      frame.fills = [];
    }
  } else {
    frame.fills = [];
  }
  
  // Border
  if (borderBinding) {
    if (borderBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${borderBinding.collection}/${borderBinding.path}`);
      if (fVar) {
        frame.strokes = [
          figma.variables.setBoundVariableForPaint(
            { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
            'color',
            fVar
          )
        ];
        frame.strokeWeight = borderWidth || 1;
      }
    } else if (borderBinding.value && borderBinding.value !== "transparent") {
      frame.strokes = [{ type: 'SOLID', color: hexToFigmaRgb(borderBinding.value.toString()) }];
      frame.strokeWeight = borderWidth || 1;
    } else {
      frame.strokes = [];
    }
  } else {
    frame.strokes = [];
  }
  
  // Radius
  if (radiusBinding) {
    if (radiusBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${radiusBinding.collection}/${radiusBinding.path}`);
      if (fVar) {
        frame.setBoundVariable('topLeftRadius', fVar);
        frame.setBoundVariable('topRightRadius', fVar);
        frame.setBoundVariable('bottomLeftRadius', fVar);
        frame.setBoundVariable('bottomRightRadius', fVar);
      }
    } else if (radiusBinding.value !== undefined) {
      frame.cornerRadius = Number(radiusBinding.value) || 0;
    }
  }
  
  if (parent) parent.appendChild(frame);
  return frame;
}

// Function to draw/style a component node
async function drawComponentNode(
  node: ComponentNode,
  componentId: string,
  variantData: any,
  figmaVarsMap: Map<string, Variable>
) {
  const styles = variantData.styles;
  const options = variantData.options;
  const state = variantData.properties.state || "default";

  // Setup Base Auto Layout on the root component node
  node.layoutMode = "HORIZONTAL";
  node.primaryAxisAlignItems = "CENTER";
  node.counterAxisAlignItems = "CENTER";
  node.primaryAxisSizingMode = "AUTO";
  node.counterAxisSizingMode = "AUTO";
  
  // Defensive: Clear any inherited stroke dash patterns
  try {
    node.dashPattern = [];
  } catch (e) {}

  // Apply root padding, radius, background, border
  const bgBinding = styles["container.bg"];
  if (bgBinding) {
    if (bgBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${bgBinding.collection}/${bgBinding.path}`);
      if (fVar) {
        node.fills = [
          figma.variables.setBoundVariableForPaint(
            { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
            'color',
            fVar
          )
        ];
      }
    } else if (bgBinding.value && bgBinding.value !== "transparent") {
      node.fills = [{ type: 'SOLID', color: hexToFigmaRgb(bgBinding.value.toString()) }];
    } else {
      node.fills = [];
    }
  } else {
    node.fills = [];
  }

  const borderBinding = styles["container.border"];
  const borderWidthBinding = styles["container.borderWidth"];
  const borderWidth = borderWidthBinding ? Number(borderWidthBinding.value) || 1 : 1;

  if (borderBinding) {
    if (borderBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${borderBinding.collection}/${borderBinding.path}`);
      if (fVar) {
        node.strokes = [
          figma.variables.setBoundVariableForPaint(
            { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
            'color',
            fVar
          )
        ];
        node.strokeWeight = borderWidth;
      }
    } else if (borderBinding.value && borderBinding.value !== "transparent") {
      node.strokes = [{ type: 'SOLID', color: hexToFigmaRgb(borderBinding.value.toString()) }];
      node.strokeWeight = borderWidth;
    } else {
      node.strokes = [];
    }
  } else {
    node.strokes = [];
  }

  const radiusBinding = styles["container.radius"];
  if (radiusBinding && radiusBinding.type === "ALIAS") {
    const fVar = figmaVarsMap.get(`${radiusBinding.collection}/${radiusBinding.path}`);
    if (fVar) {
      node.setBoundVariable('topLeftRadius', fVar);
      node.setBoundVariable('topRightRadius', fVar);
      node.setBoundVariable('bottomLeftRadius', fVar);
      node.setBoundVariable('bottomRightRadius', fVar);
    }
  } else if (radiusBinding && radiusBinding.value !== undefined) {
    node.cornerRadius = Number(radiusBinding.value) || 0;
  }

  const padXBinding = styles["container.padX"];
  if (padXBinding && padXBinding.type === "ALIAS") {
    const fVar = figmaVarsMap.get(`${padXBinding.collection}/${padXBinding.path}`);
    if (fVar) {
      node.setBoundVariable('paddingLeft', fVar);
      node.setBoundVariable('paddingRight', fVar);
    }
  } else if (padXBinding && padXBinding.value !== undefined) {
    node.paddingLeft = Number(padXBinding.value) || 0;
    node.paddingRight = Number(padXBinding.value) || 0;
  }

  const padYBinding = styles["container.padY"];
  if (padYBinding && padYBinding.type === "ALIAS") {
    const fVar = figmaVarsMap.get(`${padYBinding.collection}/${padYBinding.path}`);
    if (fVar) {
      node.setBoundVariable('paddingTop', fVar);
      node.setBoundVariable('paddingBottom', fVar);
    }
  } else if (padYBinding && padYBinding.value !== undefined) {
    node.paddingTop = Number(padYBinding.value) || 0;
    node.paddingBottom = Number(padYBinding.value) || 0;
  }

  // Elevation — a shared effect style, never a fake shadow layer.
  const elevBinding = styles["container.elevation"];
  if (elevBinding && elevBinding.value) {
    applyElevation(node, String(elevBinding.value));
  } else {
    try {
      (node as any).effectStyleId = "";
      node.effects = [];
    } catch (e) { /* no-op */ }
  }

  // Clear existing children for redraw
  [...node.children].forEach(c => c.remove());

  // Render Component Specific Nodes
  switch (componentId) {
    case "button":
    case "iconButton":
      await drawButton(node, styles, options, componentId, figmaVarsMap);
      break;
    case "checkbox":
    case "radio":
      await drawSelectionControl(node, styles, options, componentId, state, variantData.properties, figmaVarsMap);
      break;
    case "switch":
      await drawSwitchControl(node, styles, options, state, variantData.properties, figmaVarsMap);
      break;
    case "input":
    case "textarea":
    case "select":
    case "searchField":
      await drawFormControl(node, styles, options, componentId, state, figmaVarsMap);
      break;
    case "badge":
    case "tag":
      await drawBadgeTag(node, styles, options, componentId, figmaVarsMap);
      break;
    case "avatar":
      await drawAvatar(node, styles, options, figmaVarsMap);
      break;
    case "tooltip":
      await drawTooltip(node, styles, options, figmaVarsMap);
      break;
    case "progress":
    case "slider":
      await drawProgressSlider(node, styles, options, componentId, figmaVarsMap);
      break;
    case "divider":
      await drawDivider(node, styles, figmaVarsMap);
      break;
    case "alert":
    case "toast":
    case "banner":
      await drawAlertToastBanner(node, styles, options, componentId, figmaVarsMap);
      break;
    case "card":
    case "modal":
      await drawCardModal(node, styles, options, componentId, figmaVarsMap);
      break;
    case "tabs":
    case "accordion":
    case "dropdown":
      await drawInteractiveNavigation(node, styles, options, componentId, figmaVarsMap);
      break;
    case "table":
      await drawTable(node, styles, options, figmaVarsMap);
      break;
    case "navbar":
    case "sidebar":
      await drawNavbarSidebar(node, styles, options, componentId, figmaVarsMap);
      break;
    case "breadcrumbs":
    case "steps":
    case "pagination":
      await drawNavigationLanes(node, styles, options, componentId, figmaVarsMap);
      break;
    case "link":
      await drawLink(node, styles, options, figmaVarsMap);
      break;
    case "listItem":
    case "feedItem":
      await drawListFeedItems(node, styles, options, componentId, figmaVarsMap);
      break;
    case "emptyState":
    case "codeBlock":
      await drawComplexDisplays(node, styles, options, componentId, figmaVarsMap);
      break;
    case "stat":
    case "statGrid":
      await drawStats(node, styles, options, componentId, figmaVarsMap);
      break;
    case "stepper":
    case "buttonGroup":
    case "field":
      await drawAdvancedControls(node, styles, options, componentId, state, figmaVarsMap);
      break;
    case "spinner":
    case "skeleton":
    case "kbd":
      await drawStatusIndicators(node, styles, options, componentId, figmaVarsMap);
      break;
    case "chip":
      await drawChip(node, styles, options, state, figmaVarsMap);
      break;
    case "rating":
      await drawRating(node, styles, options, figmaVarsMap);
      break;
    case "popover":
      await drawPopover(node, styles, options, figmaVarsMap);
      break;
    case "fileUpload":
      await drawFileUpload(node, styles, options, figmaVarsMap);
      break;
    case "timeline":
      await drawTimeline(node, styles, options, figmaVarsMap);
      break;
    case "tree":
      await drawTree(node, styles, options, figmaVarsMap);
      break;
    case "datePicker":
      await drawDatePicker(node, styles, options, figmaVarsMap);
      break;
    default:
      await drawFallback(node, componentId);
  }
}

/* ── Extended-library renderers (industry-parity additions) ── */

async function drawChip(node: ComponentNode, styles: any, options: any, state: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 6;
  if (!styles["container.bg"]) {
    node.fills = semPaint(figmaVarsMap, "surface/subtle", { r: 0.94, g: 0.94, b: 0.96 });
  }
  if (node.cornerRadius === 0 || node.cornerRadius === figma.mixed) node.cornerRadius = 99;
  if (node.paddingLeft === 0) { node.paddingLeft = 10; node.paddingRight = 10; node.paddingTop = 4; node.paddingBottom = 4; }

  const label = await createTextHelper(node, "label", options.label || "Filter Chip", 11.5, styles["text.color"], "Inter", "Medium", figmaVarsMap);
  bindTextVars(label, styles, "text", figmaVarsMap);

  const cross = figma.createVector();
  cross.name = "removeIcon";
  cross.vectorPaths = [{ windingRule: "NONZERO", data: "M 2 2 L 8 8 M 8 2 L 2 8" }];
  cross.strokes = semPaint(figmaVarsMap, "text/muted", { r: 0.5, g: 0.5, b: 0.55 });
  cross.strokeWeight = 1.2;
  node.appendChild(cross);
}

async function drawRating(node: ComponentNode, styles: any, options: any, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 4;
  const starPath = "M 7 0 L 9 4.6 L 14 5.2 L 10.4 8.6 L 11.4 13.6 L 7 11.2 L 2.6 13.6 L 3.6 8.6 L 0 5.2 L 5 4.6 Z";
  for (let i = 0; i < 5; i++) {
    const star = figma.createVector();
    star.name = i < 4 ? "starFilled" : "starEmpty";
    star.vectorPaths = [{ windingRule: "NONZERO", data: starPath }];
    star.strokes = [];
    star.fills = i < 4
      ? semPaint(figmaVarsMap, "feedback/warning/text", { r: 0.95, g: 0.7, b: 0.15 })
      : semPaint(figmaVarsMap, "border/default", { r: 0.85, g: 0.85, b: 0.88 });
    node.appendChild(star);
  }
  await createTextHelper(node, "value", "4.0", 11.5, sem("text/muted"), "Inter", "Medium", figmaVarsMap);
}

async function drawPopover(node: ComponentNode, styles: any, options: any, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.itemSpacing = 8;
  node.primaryAxisAlignItems = "MIN";
  node.counterAxisAlignItems = "MIN";
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.resize(260, 140);
  if (node.paddingLeft === 0) { node.paddingLeft = 16; node.paddingRight = 16; node.paddingTop = 14; node.paddingBottom = 14; }
  if (!styles["container.bg"]) node.fills = semPaint(figmaVarsMap, "surface/elevated", { r: 1, g: 1, b: 1 });
  if (!styles["container.border"]) {
    node.strokes = semPaint(figmaVarsMap, "border/default", { r: 0.87, g: 0.87, b: 0.9 });
    node.strokeWeight = 1;
  }

  await createTextHelper(node, "title", options.title || "Popover Title", 13, styles["text.color"], "Inter", "Semi Bold", figmaVarsMap);
  const body = await createTextHelper(node, "body", "Anchored contextual content with room for a quick action.", 11.5, sem("text/muted"), "Inter", "Regular", figmaVarsMap);
  body.resize(220, body.height);
  body.textAutoResize = "HEIGHT";
  await createTextHelper(node, "action", "Quick action →", 11.5, sem("text/link"), "Inter", "Medium", figmaVarsMap);
}

async function drawFileUpload(node: ComponentNode, styles: any, options: any, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.itemSpacing = 8;
  node.primaryAxisAlignItems = "CENTER";
  node.counterAxisAlignItems = "CENTER";
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.resize(280, 150);
  if (!styles["container.bg"]) node.fills = semPaint(figmaVarsMap, "surface/subtle", { r: 0.97, g: 0.97, b: 0.98 });
  node.strokes = styles["container.border"] && styles["container.border"].type === "ALIAS"
    ? node.strokes
    : semPaint(figmaVarsMap, "border/default", { r: 0.8, g: 0.8, b: 0.84 });
  node.strokeWeight = 1.5;
  node.dashPattern = [6, 6];
  if (node.cornerRadius === 0 || node.cornerRadius === figma.mixed) node.cornerRadius = 12;

  const arrow = figma.createVector();
  arrow.name = "uploadIcon";
  arrow.vectorPaths = [{ windingRule: "NONZERO", data: "M 8 14 L 8 3 M 3 8 L 8 3 L 13 8" }];
  arrow.strokes = semPaint(figmaVarsMap, "text/muted", { r: 0.5, g: 0.5, b: 0.55 });
  arrow.strokeWeight = 1.8;
  node.appendChild(arrow);

  await createTextHelper(node, "title", "Drop files to upload", 12.5, styles["text.color"], "Inter", "Semi Bold", figmaVarsMap);
  await createTextHelper(node, "hint", "or click to browse · max 10 MB", 10.5, sem("text/muted"), "Inter", "Regular", figmaVarsMap);
}

async function drawTimeline(node: ComponentNode, styles: any, options: any, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.itemSpacing = 0;
  node.primaryAxisAlignItems = "MIN";
  node.counterAxisAlignItems = "MIN";

  const events = [
    { title: "Order placed", time: "09:12", active: true },
    { title: "Payment confirmed", time: "09:14", active: true },
    { title: "Shipped", time: "—", active: false },
  ];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const row = figma.createFrame();
    row.name = `event${i + 1}`;
    row.layoutMode = "HORIZONTAL";
    row.itemSpacing = 12;
    row.fills = [];
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";
    row.counterAxisAlignItems = "MIN";

    const railCol = figma.createFrame();
    railCol.name = "rail";
    railCol.layoutMode = "VERTICAL";
    railCol.itemSpacing = 0;
    railCol.fills = [];
    railCol.counterAxisAlignItems = "CENTER";
    railCol.primaryAxisSizingMode = "AUTO";
    railCol.counterAxisSizingMode = "AUTO";

    const dot = figma.createEllipse();
    dot.resize(10, 10);
    dot.fills = ev.active
      ? semPaint(figmaVarsMap, "action/primary/default", { r: 0.38, g: 0.4, b: 0.95 })
      : semPaint(figmaVarsMap, "border/default", { r: 0.85, g: 0.85, b: 0.88 });
    railCol.appendChild(dot);
    if (i < events.length - 1) {
      const rail = figma.createFrame();
      rail.resize(2, 34);
      rail.fills = semPaint(figmaVarsMap, "border/muted", { r: 0.9, g: 0.9, b: 0.92 });
      railCol.appendChild(rail);
    }
    row.appendChild(railCol);

    const textCol = figma.createFrame();
    textCol.name = "textCol";
    textCol.layoutMode = "VERTICAL";
    textCol.itemSpacing = 2;
    textCol.fills = [];
    textCol.primaryAxisSizingMode = "AUTO";
    textCol.counterAxisSizingMode = "AUTO";
    await createTextHelper(textCol, "title", ev.title, 12, ev.active ? styles["text.color"] : sem("text/muted"), "Inter", ev.active ? "Semi Bold" : "Regular", figmaVarsMap);
    await createTextHelper(textCol, "time", ev.time, 10.5, sem("text/muted"), "Inter", "Regular", figmaVarsMap);
    row.appendChild(textCol);

    node.appendChild(row);
  }
}

async function drawTree(node: ComponentNode, styles: any, options: any, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.itemSpacing = 4;
  node.primaryAxisAlignItems = "MIN";
  node.counterAxisAlignItems = "MIN";

  const rows: Array<{ label: string; depth: number; open?: boolean; active?: boolean }> = [
    { label: "src", depth: 0, open: true },
    { label: "components", depth: 1, open: true },
    { label: "Button.tsx", depth: 2, active: true },
    { label: "Input.tsx", depth: 2 },
    { label: "lib", depth: 1 },
  ];
  for (const r of rows) {
    const row = figma.createFrame();
    row.name = r.active ? "treeItemActive" : "treeItem";
    row.layoutMode = "HORIZONTAL";
    row.itemSpacing = 6;
    row.paddingLeft = 8 + r.depth * 18;
    row.paddingRight = 10;
    row.paddingTop = 4; row.paddingBottom = 4;
    row.cornerRadius = 6;
    row.counterAxisAlignItems = "CENTER";
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";
    row.fills = r.active ? semPaint(figmaVarsMap, "surface/subtle", { r: 0.93, g: 0.93, b: 0.95 }) : [];

    if (r.open !== undefined) {
      const chev = figma.createVector();
      chev.name = "chevron";
      chev.vectorPaths = [{ windingRule: "NONZERO", data: r.open ? "M 2 4 L 6 8 L 10 4" : "M 4 2 L 8 6 L 4 10" }];
      chev.strokes = semPaint(figmaVarsMap, "text/muted", { r: 0.5, g: 0.5, b: 0.55 });
      chev.strokeWeight = 1.4;
      row.appendChild(chev);
    }
    await createTextHelper(row, "label", r.label, 11.5, r.active ? styles["text.color"] : sem("text/muted"), "Inter", r.active ? "Semi Bold" : "Regular", figmaVarsMap);
    node.appendChild(row);
  }
}

async function drawDatePicker(node: ComponentNode, styles: any, options: any, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 8;
  node.primaryAxisAlignItems = "MIN";
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.resize(220, 38);

  const calIcon = figma.createFrame();
  calIcon.name = "calendarIcon";
  calIcon.primaryAxisSizingMode = "FIXED";
  calIcon.counterAxisSizingMode = "FIXED";
  calIcon.resize(14, 14);
  calIcon.fills = [];
  calIcon.strokes = semPaint(figmaVarsMap, "text/muted", { r: 0.5, g: 0.5, b: 0.55 });
  calIcon.strokeWeight = 1.4;
  calIcon.cornerRadius = 3;
  node.appendChild(calIcon);

  const value = await createTextHelper(node, "text", "12 / 07 / 2026", 13, styles["text.color"], "Inter", "Regular", figmaVarsMap);
  bindTextVars(value, styles, "text", figmaVarsMap);
  value.layoutGrow = 1;

  const chev = figma.createVector();
  chev.name = "chevronIcon";
  chev.vectorPaths = [{ windingRule: "NONZERO", data: "M 2 4 L 6 8 L 10 4" }];
  chev.strokes = semPaint(figmaVarsMap, "text/muted", { r: 0.5, g: 0.5, b: 0.55 });
  chev.strokeWeight = 1.5;
  node.appendChild(chev);
}

// ── SUB-RENDERERS FOR ALL 43 COMPONENTS ──

async function drawButton(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 8;
  
  if (componentId === "button") {
    // Icon slots are ALWAYS drawn so the "Show prefix/suffix icon" boolean
    // component properties have a layer to toggle; default visibility follows
    // the stored option (which also names the Material Symbols icon to place).
    const prefix = renderIconSlot(node, "prefixIcon", 14, styles["prefixIcon.color"], options.prefixIcon, figmaVarsMap);
    prefix.visible = !!options.prefixIcon;

    const label = await createTextHelper(node, "label", options.label || "Action Button", 13, styles["label.color"], "Inter", "Semi Bold", figmaVarsMap);
    bindTextVars(label, styles, "label", figmaVarsMap);

    const suffix = renderIconSlot(node, "suffixIcon", 14, styles["suffixIcon.color"], options.suffixIcon, figmaVarsMap);
    suffix.visible = !!options.suffixIcon;
  } else {
    // IconButton
    renderIconSlot(node, "icon", 16, styles["icon.color"], options.icon, figmaVarsMap);
  }
}

async function drawSelectionControl(
  node: ComponentNode, 
  styles: any, 
  options: any, 
  componentId: string, 
  state: string, 
  properties: any,
  figmaVarsMap: Map<string, Variable>
) {
  options = options || {};
  properties = properties || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 8;
  node.primaryAxisAlignItems = "MIN";
  
  const checked = properties.checked === "true" || properties.checked === true;
  
  const control = figma.createFrame();
  control.name = "control";
  control.primaryAxisSizingMode = "FIXED";
  control.counterAxisSizingMode = "FIXED";
  control.resize(18, 18);
  control.cornerRadius = componentId === "checkbox" ? 4 : 99;
  
  // Background fill
  const bgKey = checked ? "box.bgOn" : "box.bgOff";
  const bgBinding = styles[bgKey] || styles["dot.bg"] || styles["dot.fill"];
  if (bgBinding && checked) {
    if (bgBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${bgBinding.collection}/${bgBinding.path}`);
      if (fVar) control.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', fVar)];
    } else if (bgBinding.value) {
      control.fills = [{ type: 'SOLID', color: hexToFigmaRgb(bgBinding.value.toString()) }];
    }
  } else {
    // Off — unchecked wells sit on the elevated surface role
    control.fills = semPaint(figmaVarsMap, "surface/elevated", { r: 0.96, g: 0.96, b: 0.97 });
  }

  // Border
  if (!checked) {
    const borderBinding = styles["box.borderOff"] || styles["dot.border"];
    if (borderBinding && borderBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${borderBinding.collection}/${borderBinding.path}`);
      if (fVar) {
        control.strokes = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', fVar)];
        control.strokeWeight = 1.5;
      }
    } else {
      control.strokes = semPaint(figmaVarsMap, "border/default", { r: 0.78, g: 0.78, b: 0.82 });
      control.strokeWeight = 1.5;
    }
  }

  // Draw inner mark
  if (checked) {
    control.layoutMode = "HORIZONTAL";
    control.primaryAxisAlignItems = "CENTER";
    control.counterAxisAlignItems = "CENTER";
    
    if (componentId === "checkbox") {
      const check = figma.createVector();
      check.name = "checkmark";
      check.vectorPaths = [{ windingRule: "NONZERO", data: "M 4 8 L 7 11 L 14 4" }];
      check.strokeWeight = 2.5;
      check.strokes = semPaint(figmaVarsMap, "text/on/action", { r: 1, g: 1, b: 1 });
      control.appendChild(check);
    } else {
      const dot = figma.createEllipse();
      dot.resize(8, 8);
      dot.fills = semPaint(figmaVarsMap, "text/on/action", { r: 1, g: 1, b: 1 });
      control.appendChild(dot);
    }
  }
  
  node.appendChild(control);

  // Label
  const labelColor = state === "disabled" ? styles["box.borderOff"] : undefined;
  await createTextHelper(node, "label", options.label || "Selection Option", 13, labelColor, "Inter", "Regular", figmaVarsMap);
}

async function drawSwitchControl(
  node: ComponentNode, 
  styles: any, 
  options: any, 
  state: string, 
  properties: any,
  figmaVarsMap: Map<string, Variable>
) {
  options = options || {};
  properties = properties || {};
  node.layoutMode = "HORIZONTAL";
  node.primaryAxisAlignItems = "MIN";

  const checked = properties.checked === "true" || properties.checked === true;
  
  const track = figma.createFrame();
  track.name = "switchTrack";
  track.primaryAxisSizingMode = "FIXED";
  track.counterAxisSizingMode = "FIXED";
  track.resize(36, 20);
  track.cornerRadius = 999;
  
  const trackKey = checked ? "switchTrack.on" : "switchTrack.off";
  const trackBinding = styles[trackKey];
  if (trackBinding && trackBinding.type === "ALIAS") {
    const fVar = figmaVarsMap.get(`${trackBinding.collection}/${trackBinding.path}`);
    if (fVar) track.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', fVar)];
  } else {
    track.fills = checked
      ? semPaint(figmaVarsMap, "action/primary/default", { r: 0.38, g: 0.4, b: 0.95 })
      : semPaint(figmaVarsMap, "surface/sunken", { r: 0.88, g: 0.88, b: 0.9 });
  }

  const thumb = figma.createFrame();
  thumb.name = "switchThumb";
  thumb.primaryAxisSizingMode = "FIXED";
  thumb.counterAxisSizingMode = "FIXED";
  thumb.resize(14, 14);
  thumb.cornerRadius = 99;
  thumb.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  
  thumb.y = 3;
  thumb.x = checked ? 19 : 3;
  
  track.appendChild(thumb);
  node.appendChild(track);
}

async function drawFormControl(node: ComponentNode, styles: any, options: any, componentId: string, state: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.primaryAxisAlignItems = "MIN";
  node.itemSpacing = 8;
  
  // Set both to FIXED so size is respected in all parent layout environments
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.resize(220, componentId === "textarea" ? 80 : 38);
  
  // Align textarea content to the top left instead of center
  if (componentId === "textarea") {
    node.counterAxisAlignItems = "MIN";
  }

  if (componentId === "searchField") {
    const icon = figma.createFrame();
    icon.name = "searchIcon";
    icon.primaryAxisSizingMode = "FIXED";
    icon.counterAxisSizingMode = "FIXED";
    icon.resize(14, 14);
    icon.fills = [];
    const circle = figma.createEllipse();
    circle.resize(10, 10);
    circle.strokes = semPaint(figmaVarsMap, "text/muted", { r: 0.5, g: 0.5, b: 0.5 });
    circle.strokeWeight = 1.5;
    icon.appendChild(circle);
    node.appendChild(icon);
  }

  let placeholderText = options.placeholder || "Enter text...";
  if (componentId === "select") placeholderText = "Select option...";
  if (componentId === "searchField") placeholderText = "Search...";

  const labelText = await createTextHelper(node, "text", placeholderText, 13, styles["text.color"], "Inter", "Regular", figmaVarsMap);
  bindTextVars(labelText, styles, "text", figmaVarsMap);
  labelText.layoutGrow = 1;

  if (componentId === "select") {
    const icon = figma.createFrame();
    icon.name = "chevronIcon";
    icon.primaryAxisSizingMode = "FIXED";
    icon.counterAxisSizingMode = "FIXED";
    icon.resize(12, 12);
    icon.fills = [];
    const arrow = figma.createVector();
    arrow.vectorPaths = [{ windingRule: "NONZERO", data: "M 2 4 L 6 8 L 10 4" }];
    arrow.strokes = semPaint(figmaVarsMap, "text/muted", { r: 0.5, g: 0.5, b: 0.5 });
    arrow.strokeWeight = 1.5;
    icon.appendChild(arrow);
    node.appendChild(icon);
  }
}

async function drawBadgeTag(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 6;
  
  // Badge/tag specs carry no padY — give the pill some vertical breathing room.
  if (node.paddingTop === 0) { node.paddingTop = 3; node.paddingBottom = 3; }
  if (node.paddingLeft === 0) { node.paddingLeft = 8; node.paddingRight = 8; }

  if (componentId === "badge") {
    // Always drawn so the "Show dot" boolean property has a layer to toggle.
    const dot = figma.createEllipse();
    dot.name = "statusDot";
    dot.resize(6, 6);
    const dotBinding = styles["statusDot.color"];
    if (dotBinding && dotBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${dotBinding.collection}/${dotBinding.path}`);
      dot.fills = fVar
        ? [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0.2, g: 0.8, b: 0.5 } }, 'color', fVar)]
        : semPaint(figmaVarsMap, "feedback/success/text", { r: 0.2, g: 0.8, b: 0.5 });
    } else if (dotBinding && dotBinding.value) {
      dot.fills = [{ type: 'SOLID', color: hexToFigmaRgb(dotBinding.value.toString()) }];
    } else {
      dot.fills = semPaint(figmaVarsMap, "feedback/success/text", { r: 0.2, g: 0.8, b: 0.5 });
    }
    dot.visible = !!options.dot;
    node.appendChild(dot);
  }

  const label = await createTextHelper(node, "label", options.label || "Tag", 11, styles["text.color"], "Inter", "Semi Bold", figmaVarsMap);
  bindTextVars(label, styles, "text", figmaVarsMap);

  if (componentId === "tag") {
    const cross = figma.createVector();
    cross.name = "removeIcon";
    cross.vectorPaths = [{ windingRule: "NONZERO", data: "M 2 2 L 8 8 M 8 2 L 2 8" }];
    cross.strokes = semPaint(figmaVarsMap, "text/muted", { r: 0.5, g: 0.5, b: 0.55 });
    cross.strokeWeight = 1.2;
    cross.visible = options.removable !== false;
    node.appendChild(cross);
  }
}

async function drawAvatar(node: ComponentNode, styles: any, options: any, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "NONE";
  
  const size = options.size === "sm" ? 28 : options.size === "md" ? 36 : 48;
  
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.resize(size, size);
  node.cornerRadius = 9999;

  const text = await createTextHelper(node, "initials", options.initials || "JD", size * 0.38, styles["text.color"], "Inter", "Bold", figmaVarsMap);
  text.x = (size - text.width) / 2;
  text.y = (size - text.height) / 2;
  
  if (options.presence && options.presence !== "none") {
    const dot = figma.createEllipse();
    dot.name = "presence";
    const dotSize = Math.max(8, size * 0.22);
    dot.resize(dotSize, dotSize);
    dot.x = size - dotSize;
    dot.y = size - dotSize;
    
    dot.strokes = semPaint(figmaVarsMap, "surface/base", { r: 1, g: 1, b: 1 });
    dot.strokeWeight = 1.5;

    dot.fills = options.presence === "online"
      ? semPaint(figmaVarsMap, "feedback/success/text", { r: 0.1, g: 0.8, b: 0.4 })
      : semPaint(figmaVarsMap, "text/muted", { r: 0.6, g: 0.6, b: 0.6 });
    node.appendChild(dot);
  }
}

async function drawTooltip(node: ComponentNode, styles: any, options: any, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.paddingTop = 6;
  node.paddingBottom = 6;
  node.paddingLeft = 10;
  node.paddingRight = 10;
  
  await createTextHelper(node, "text", options.label || "Tooltip description text", 11, styles["text.color"], "Inter", "Regular", figmaVarsMap);
}

async function drawProgressSlider(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.itemSpacing = 8;
  
  node.primaryAxisSizingMode = "FIXED";
  node.resize(160, node.height);
  
  const track = await createFrameHelper(node, "track", "HORIZONTAL", 0, 0, 0, styles["track.bg"], null, 0, styles["track.radius"], figmaVarsMap);
  track.primaryAxisSizingMode = "FIXED";
  track.counterAxisSizingMode = "FIXED";
  track.resize(160, 6);
  
  const fill = await createFrameHelper(track, "fill", "NONE", 0, 0, 0, styles["fill.bg"], null, 0, null, figmaVarsMap);
  fill.resize(96, 6);
  
  if (componentId === "slider") {
    const thumb = await createFrameHelper(track, "thumb", "NONE", 0, 0, 0, styles["thumb.bg"], styles["thumb.border"], 1.5, null, figmaVarsMap);
    thumb.primaryAxisSizingMode = "FIXED";
    thumb.counterAxisSizingMode = "FIXED";
    thumb.resize(14, 14);
    thumb.cornerRadius = 99;
    thumb.x = 89;
    thumb.y = -4;
  }
}

/** A 1px horizontal rule INSIDE an auto-layout parent. (Never restyles the
 * parent — the old approach of reusing drawDivider on the container node
 * resized whole cards/modals down to 180×1 slivers.) */
async function appendDividerLine(
  parent: FrameNode | ComponentNode,
  styles: any,
  figmaVarsMap: Map<string, Variable>
): Promise<FrameNode> {
  const border = styles["container.border"] || { type: "ALIAS", collection: "Semantics", path: "border/muted" };
  const line = await createFrameHelper(parent, "divider", "NONE", 0, 0, 0, border, null, 0, null, figmaVarsMap);
  line.resize(10, 1);
  line.layoutAlign = "STRETCH";
  return line;
}

async function drawDivider(node: ComponentNode, styles: any, figmaVarsMap: Map<string, Variable>) {
  node.layoutMode = "HORIZONTAL";
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.resize(180, 1);
  node.fills = [];
  
  const border = styles["container.border"] || styles["divider.color"] || { type: "ALIAS", collection: "Semantics", path: "border/default" };
  const line = await createFrameHelper(node, "line", "NONE", 0, 0, 0, border, null, 0, null, figmaVarsMap);
  line.layoutAlign = "STRETCH";
  line.layoutGrow = 1;
  line.resize(line.width, 1);
}

async function drawAlertToastBanner(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 12;
  node.primaryAxisAlignItems = "MIN";
  
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "AUTO";
  node.resize(280, node.height);

  const indicator = figma.createFrame();
  indicator.name = "indicator";
  indicator.primaryAxisSizingMode = "FIXED";
  indicator.counterAxisSizingMode = "FIXED";
  indicator.resize(14, 14);
  indicator.cornerRadius = 99;
  
  const tone = options.tone === "success" || options.tone === "error" || options.tone === "warning" ? options.tone : "info";
  const toneFallback = tone === "success" ? { r: 0.1, g: 0.8, b: 0.4 } :
                       tone === "error" ? { r: 0.9, g: 0.2, b: 0.2 } :
                       tone === "warning" ? { r: 0.9, g: 0.6, b: 0.1 } : { r: 0.2, g: 0.5, b: 0.9 };
  // The bundle injects a tone-accurate accent (indicator.color) per variant.
  const indicatorBinding = styles["indicator.color"];
  if (indicatorBinding && indicatorBinding.type === "ALIAS") {
    const fVar = figmaVarsMap.get(`${indicatorBinding.collection}/${indicatorBinding.path}`);
    indicator.fills = fVar
      ? [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: toneFallback }, 'color', fVar)]
      : semPaint(figmaVarsMap, `feedback/${tone}/text`, toneFallback);
  } else if (indicatorBinding && indicatorBinding.value) {
    indicator.fills = [{ type: 'SOLID', color: hexToFigmaRgb(indicatorBinding.value.toString()) }];
  } else {
    indicator.fills = semPaint(figmaVarsMap, `feedback/${tone}/text`, toneFallback);
  }
  node.appendChild(indicator);

  const messageStack = figma.createFrame();
  messageStack.name = "messageStack";
  messageStack.layoutMode = "VERTICAL";
  messageStack.itemSpacing = 2;
  messageStack.fills = [];
  messageStack.layoutGrow = 1;
  messageStack.primaryAxisSizingMode = "AUTO";
  messageStack.counterAxisSizingMode = "AUTO";
  
  // Toast declares text.title/text.body; alert/banner get label/text colors
  // injected per tone by the bundle compiler.
  const titleColor = styles["label.color"] || styles["text.title"];
  const descColor = styles["text.color"] || styles["text.body"];
  await createTextHelper(messageStack, "title", options.title || "Notification Title", 12, titleColor, "Inter", "Bold", figmaVarsMap);
  await createTextHelper(messageStack, "desc", options.description || options.body || "Detailed message regarding the alert.", 11, descColor, "Inter", "Regular", figmaVarsMap);
  
  node.appendChild(messageStack);

  const close = figma.createVector();
  close.name = "closeIcon";
  close.vectorPaths = [{ windingRule: "NONZERO", data: "M 2 2 L 8 8 M 8 2 L 2 8" }];
  close.strokes = semPaint(figmaVarsMap, "text/muted", { r: 0.5, g: 0.5, b: 0.5 });
  close.strokeWeight = 1.2;
  close.visible = options.dismissible !== false;
  node.appendChild(close);
}

async function drawCardModal(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.itemSpacing = 16;
  node.primaryAxisAlignItems = "MIN";
  node.counterAxisAlignItems = "MIN";

  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.resize(320, 220);

  // Card/modal specs expose no padX/padY props — fall back to the stored
  // padding option so content never sits flush against the container edge.
  if (node.paddingLeft === 0 && node.paddingTop === 0) {
    const pad = Math.max(0, Number(options.padding) || 20);
    node.paddingLeft = pad; node.paddingRight = pad;
    node.paddingTop = pad; node.paddingBottom = pad;
  }

  const header = figma.createFrame();
  header.name = "header";
  header.layoutMode = "HORIZONTAL";
  header.fills = [];
  header.layoutAlign = "STRETCH";
  header.primaryAxisAlignItems = "MIN";
  header.primaryAxisSizingMode = "AUTO";
  header.counterAxisSizingMode = "AUTO";
  
  const titleText = await createTextHelper(header, "title", options.title || (componentId === "card" ? "Card Header" : "Dialog Window"), 14, styles["text.color"] || styles["label.color"], "Inter", "Bold", figmaVarsMap);
  titleText.layoutGrow = 1;
  
  if (componentId === "modal") {
    await createTextHelper(header, "close", "✕", 14, styles["text.color"], "Inter", "Medium", figmaVarsMap);
  }
  node.appendChild(header);

  await appendDividerLine(node, styles, figmaVarsMap);

  // Resize TextNode before locking textAutoResize to HEIGHT so it doesn't wrap into single-character columns!
  const desc = await createTextHelper(node, "bodyText", options.bodyText || options.description || "This represents the main content block for the container. Describe options, states, and guidelines.", 12, styles["text.color"], "Inter", "Regular", figmaVarsMap);
  desc.resize(280, 40);
  desc.layoutAlign = "STRETCH";
  desc.layoutGrow = 1;
  desc.textAutoResize = "HEIGHT";

  const footer = figma.createFrame();
  footer.name = "footer";
  footer.layoutMode = "HORIZONTAL";
  footer.fills = [];
  footer.itemSpacing = 8;
  footer.layoutAlign = "STRETCH";
  footer.primaryAxisAlignItems = componentId === "modal" ? "MAX" : "MIN";
  footer.primaryAxisSizingMode = "AUTO";
  footer.counterAxisSizingMode = "AUTO";

  if (componentId === "modal") {
    const btnCancel = figma.createFrame();
    btnCancel.name = "btnCancel";
    btnCancel.layoutMode = "HORIZONTAL";
    btnCancel.paddingLeft = 12; btnCancel.paddingRight = 12;
    btnCancel.paddingTop = 6; btnCancel.paddingBottom = 6;
    btnCancel.cornerRadius = 6;
    btnCancel.fills = semPaint(figmaVarsMap, "surface/subtle", { r: 0.93, g: 0.93, b: 0.95 });
    btnCancel.strokes = semPaint(figmaVarsMap, "border/default", { r: 0.85, g: 0.85, b: 0.88 });
    await createTextHelper(btnCancel, "text", "Cancel", 11, null, "Inter", "Medium", figmaVarsMap);
    footer.appendChild(btnCancel);
  }

  const btnAction = figma.createFrame();
  btnAction.name = "btnAction";
  btnAction.layoutMode = "HORIZONTAL";
  btnAction.paddingLeft = 16; btnAction.paddingRight = 16;
  btnAction.paddingTop = 6; btnAction.paddingBottom = 6;
  btnAction.cornerRadius = 6;
  
  const activeVar = figmaVarsMap.get("Semantics/action/primary/default");
  if (activeVar) {
    btnAction.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', activeVar)];
  } else {
    btnAction.fills = [{ type: 'SOLID', color: { r: 0.38, g: 0.4, b: 0.95 } }];
  }
  
  await createTextHelper(btnAction, "text", options.btnLabel || "Confirm", 11, sem("text/on/action"), "Inter", "Semi Bold", figmaVarsMap);
  footer.appendChild(btnAction);

  node.appendChild(footer);
}

async function drawInteractiveNavigation(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.itemSpacing = 8;
  
  if (componentId === "tabs") {
    node.layoutMode = "HORIZONTAL";
    node.itemSpacing = 16;
    
    const tab1 = figma.createFrame();
    tab1.name = "tabItemActive";
    tab1.layoutMode = "VERTICAL";
    tab1.paddingBottom = 6;
    tab1.fills = [];
    
    const activeVar = figmaVarsMap.get("Semantics/action/primary/default");
    if (activeVar) {
      tab1.strokes = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', activeVar)];
    } else {
      tab1.strokes = [{ type: 'SOLID', color: { r: 0.38, g: 0.4, b: 0.95 } }];
    }
    tab1.strokeWeight = 2.5;
    
    await createTextHelper(tab1, "label", "Active Tab", 12.5, styles["text.color"], "Inter", "Semi Bold", figmaVarsMap);
    node.appendChild(tab1);

    const tab2 = figma.createFrame();
    tab2.name = "tabItem";
    tab2.layoutMode = "VERTICAL";
    tab2.paddingBottom = 6;
    tab2.fills = [];
    await createTextHelper(tab2, "label", "Inactive Tab", 12.5, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
    node.appendChild(tab2);

  } else if (componentId === "accordion") {
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "AUTO";
    node.resize(220, node.height);
    
    const header = figma.createFrame();
    header.name = "accordionHeader";
    header.layoutMode = "HORIZONTAL";
    header.layoutAlign = "STRETCH";
    header.fills = [];
    
    const title = await createTextHelper(header, "title", options.label || "Collapsible Header", 12.5, styles["text.color"], "Inter", "Medium", figmaVarsMap);
    title.layoutGrow = 1;
    
    const arrow = figma.createVector();
    arrow.name = "chevron";
    arrow.vectorPaths = [{ windingRule: "NONZERO", data: "M 2 4 L 6 8 L 10 4" }];
    arrow.strokes = semPaint(figmaVarsMap, "text/muted", { r: 0.5, g: 0.5, b: 0.5 });
    arrow.strokeWeight = 1.5;
    header.appendChild(arrow);
    node.appendChild(header);

  } else if (componentId === "dropdown") {
    const trigger = figma.createFrame();
    trigger.name = "dropdownTrigger";
    trigger.layoutMode = "HORIZONTAL";
    trigger.paddingLeft = 12; trigger.paddingRight = 12;
    trigger.paddingTop = 6; trigger.paddingBottom = 6;
    trigger.cornerRadius = 6;
    trigger.fills = semPaint(figmaVarsMap, "surface/elevated", { r: 0.98, g: 0.98, b: 0.99 });
    trigger.strokes = semPaint(figmaVarsMap, "border/default", { r: 0.85, g: 0.85, b: 0.88 });
    await createTextHelper(trigger, "text", (options.label || "Dropdown Menu") + " ▾", 11.5, null, "Inter", "Medium", figmaVarsMap);
    node.appendChild(trigger);
  }
}

async function drawTable(node: ComponentNode, styles: any, options: any, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.itemSpacing = 0;
  
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.resize(320, 160);

  const header = figma.createFrame();
  header.name = "tableHeader";
  header.layoutMode = "HORIZONTAL";
  header.layoutAlign = "STRETCH"; // Stretches header row to fill 320px
  header.paddingTop = 8; header.paddingBottom = 8;
  header.paddingLeft = 12; header.paddingRight = 12;
  header.fills = semPaint(figmaVarsMap, "surface/subtle", { r: 0.95, g: 0.95, b: 0.96 });
  header.strokes = semPaint(figmaVarsMap, "border/muted", { r: 0.88, g: 0.88, b: 0.9 });
  header.strokeWeight = 1;
  
  const col1 = await createTextHelper(header, "col1", "Item ID", 11, null, "Inter", "Bold", figmaVarsMap);
  col1.layoutGrow = 1;
  const col2 = await createTextHelper(header, "col2", "Name", 11, null, "Inter", "Bold", figmaVarsMap);
  col2.layoutGrow = 2;
  const col3 = await createTextHelper(header, "col3", "Status", 11, null, "Inter", "Bold", figmaVarsMap);
  col3.layoutGrow = 1;
  node.appendChild(header);

  const row1 = figma.createFrame();
  row1.name = "tableRow1";
  row1.layoutMode = "HORIZONTAL";
  row1.layoutAlign = "STRETCH";
  row1.paddingTop = 8; row1.paddingBottom = 8;
  row1.paddingLeft = 12; row1.paddingRight = 12;
  row1.fills = [];
  row1.strokes = semPaint(figmaVarsMap, "border/muted", { r: 0.9, g: 0.9, b: 0.92 });
  row1.strokeWeight = 1;
  
  const col1_1 = await createTextHelper(row1, "col1", "#01", 11, null, "Inter", "Regular", figmaVarsMap);
  col1_1.layoutGrow = 1;
  const col1_2 = await createTextHelper(row1, "col2", "Workspace Sync", 11, null, "Inter", "Regular", figmaVarsMap);
  col1_2.layoutGrow = 2;
  const col1_3 = await createTextHelper(row1, "col3", "Active", 11, sem("feedback/success/text"), "Inter", "Medium", figmaVarsMap);
  col1_3.layoutGrow = 1;
  node.appendChild(row1);

  const row2 = figma.createFrame();
  row2.name = "tableRow2";
  row2.layoutMode = "HORIZONTAL";
  row2.layoutAlign = "STRETCH";
  row2.paddingTop = 8; row2.paddingBottom = 8;
  row2.paddingLeft = 12; row2.paddingRight = 12;
  row2.fills = options.striped ? semPaint(figmaVarsMap, "surface/subtle", { r: 0.97, g: 0.97, b: 0.98 }) : [];
  row2.strokes = semPaint(figmaVarsMap, "border/muted", { r: 0.9, g: 0.9, b: 0.92 });
  row2.strokeWeight = 1;
  
  const col2_1 = await createTextHelper(row2, "col1", "#02", 11, null, "Inter", "Regular", figmaVarsMap);
  col2_1.layoutGrow = 1;
  const col2_2 = await createTextHelper(row2, "col2", "Tokens Engine", 11, null, "Inter", "Regular", figmaVarsMap);
  col2_2.layoutGrow = 2;
  const col2_3 = await createTextHelper(row2, "col3", "Pending", 11, sem("feedback/warning/text"), "Inter", "Medium", figmaVarsMap);
  col2_3.layoutGrow = 1;
  node.appendChild(row2);
}

async function drawNavbarSidebar(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = componentId === "navbar" ? "HORIZONTAL" : "VERTICAL";
  node.itemSpacing = 16;
  node.primaryAxisAlignItems = "MIN";
  
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";

  if (componentId === "navbar") {
    node.resize(340, 42);
    await createTextHelper(node, "logo", "✦ Arkitype", 13.5, styles["text.color"], "Inter", "Bold", figmaVarsMap);
    
    const spacer = figma.createFrame();
    spacer.fills = [];
    spacer.layoutGrow = 1;
    spacer.resize(10, 10);
    node.appendChild(spacer);
    
    await createTextHelper(node, "link1", "Home", 11.5, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Medium", figmaVarsMap);
    await createTextHelper(node, "link2", "Docs", 11.5, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Medium", figmaVarsMap);
  } else {
    node.resize(140, 240);
    node.paddingTop = 16; node.paddingLeft = 12; node.paddingRight = 12;
    node.counterAxisAlignItems = "MIN";

    await createTextHelper(node, "logo", "✦ Navigation", 13, styles["text.color"], "Inter", "Bold", figmaVarsMap);
    
    const spacer = figma.createFrame();
    spacer.fills = [];
    spacer.resize(10, 12);
    node.appendChild(spacer);

    for (const text of ["Dashboard", "Tokens", "Components", "Settings"]) {
      const item = figma.createFrame();
      item.layoutMode = "HORIZONTAL";
      item.paddingLeft = 8; item.paddingRight = 8;
      item.paddingTop = 6; item.paddingBottom = 6;
      item.cornerRadius = 4;
      
      const active = text === "Components";
      item.fills = active ? semPaint(figmaVarsMap, "surface/subtle", { r: 0.93, g: 0.93, b: 0.95 }) : [];
      
      await createTextHelper(item, "text", text, 11.5, active ? styles["text.color"] : { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", active ? "Semi Bold" : "Regular", figmaVarsMap);
      node.appendChild(item);
    }
  }
}

async function drawNavigationLanes(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 8;

  if (componentId === "breadcrumbs") {
    await createTextHelper(node, "home", "Home", 11.5, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
    await createTextHelper(node, "sep1", "/", 11.5, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
    await createTextHelper(node, "step", "Library", 11.5, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
    await createTextHelper(node, "sep2", "/", 11.5, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
    await createTextHelper(node, "profile", "Profile", 11.5, styles["text.color"], "Inter", "Medium", figmaVarsMap);

  } else if (componentId === "steps") {
    for (const stepNum of [1, 2, 3]) {
      const circle = figma.createFrame();
      circle.primaryAxisSizingMode = "FIXED";
      circle.counterAxisSizingMode = "FIXED";
      circle.resize(18, 18);
      circle.cornerRadius = 99;
      circle.layoutMode = "HORIZONTAL";
      circle.primaryAxisAlignItems = "CENTER";
      circle.counterAxisAlignItems = "CENTER";
      
      const active = stepNum === 2;
      circle.fills = active
        ? semPaint(figmaVarsMap, "action/primary/default", { r: 0.38, g: 0.4, b: 0.95 })
        : semPaint(figmaVarsMap, "surface/subtle", { r: 0.92, g: 0.92, b: 0.94 });
      await createTextHelper(circle, "num", stepNum.toString(), 10, active ? sem("text/on/action") : sem("text/muted"), "Inter", "Bold", figmaVarsMap);
      node.appendChild(circle);

      if (stepNum < 3) {
        const line = figma.createFrame();
        line.primaryAxisSizingMode = "FIXED";
        line.counterAxisSizingMode = "FIXED";
        line.resize(24, 2);
        line.fills = semPaint(figmaVarsMap, "border/default", { r: 0.87, g: 0.87, b: 0.9 });
        node.appendChild(line);
      }
    }

  } else if (componentId === "pagination") {
    for (const label of ["⟨", "1", "2", "3", "⟩"]) {
      const btn = figma.createFrame();
      btn.primaryAxisSizingMode = "FIXED";
      btn.counterAxisSizingMode = "FIXED";
      btn.resize(22, 22);
      btn.cornerRadius = 4;
      btn.layoutMode = "HORIZONTAL";
      btn.primaryAxisAlignItems = "CENTER";
      btn.counterAxisAlignItems = "CENTER";
      
      const active = label === "2";
      btn.fills = active ? semPaint(figmaVarsMap, "action/primary/default", { r: 0.38, g: 0.4, b: 0.95 }) : [];
      btn.strokes = semPaint(figmaVarsMap, "border/default", { r: 0.87, g: 0.87, b: 0.9 });
      btn.strokeWeight = 1;

      await createTextHelper(btn, "label", label, 11, active ? sem("text/on/action") : sem("text/muted"), "Inter", active ? "Bold" : "Regular", figmaVarsMap);
      node.appendChild(btn);
    }
  }
}

async function drawListFeedItems(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 12;
  node.primaryAxisAlignItems = "MIN";
  
  node.primaryAxisSizingMode = "FIXED";
  node.resize(280, node.height);

  const avatar = figma.createFrame();
  avatar.name = "avatar";
  avatar.primaryAxisSizingMode = "FIXED";
  avatar.counterAxisSizingMode = "FIXED";
  avatar.resize(28, 28);
  avatar.cornerRadius = 99;
  avatar.fills = semPaint(figmaVarsMap, "surface/subtle", { r: 0.9, g: 0.9, b: 0.93 });
  node.appendChild(avatar);

  const textStack = figma.createFrame();
  textStack.name = "textStack";
  textStack.layoutMode = "VERTICAL";
  textStack.itemSpacing = 2;
  textStack.fills = [];
  textStack.layoutGrow = 1;
  textStack.primaryAxisSizingMode = "AUTO";
  textStack.counterAxisSizingMode = "AUTO";
  
  await createTextHelper(textStack, "title", options.title || "List Item Headline", 12, styles["label.color"] || styles["text.color"], "Inter", "Semi Bold", figmaVarsMap);
  await createTextHelper(textStack, "desc", options.subtitle || "Supporting subtext line descriptor.", 10.5, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
  node.appendChild(textStack);

  const chevron = figma.createVector();
  chevron.name = "arrow";
  chevron.vectorPaths = [{ windingRule: "NONZERO", data: "M 2 2 L 6 6 L 2 10" }];
  chevron.strokes = semPaint(figmaVarsMap, "text/muted", { r: 0.5, g: 0.5, b: 0.55 });
  chevron.strokeWeight = 1.5;
  node.appendChild(chevron);
}

async function drawComplexDisplays(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.itemSpacing = 12;
  
  if (componentId === "emptyState") {
    node.primaryAxisAlignItems = "CENTER";
    node.counterAxisAlignItems = "CENTER";
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "FIXED";
    node.resize(260, 180);

    const graphic = figma.createFrame();
    graphic.name = "graphic";
    graphic.primaryAxisSizingMode = "FIXED";
    graphic.counterAxisSizingMode = "FIXED";
    graphic.resize(48, 48);
    graphic.cornerRadius = 8;
    graphic.fills = semPaint(figmaVarsMap, "surface/subtle", { r: 0.93, g: 0.93, b: 0.95 });
    node.appendChild(graphic);

    await createTextHelper(node, "title", "No items synchronized", 13.5, styles["text.color"], "Inter", "Bold", figmaVarsMap);
    
    // Resize first to 200px before applying HEIGHT wrap
    const sub = await createTextHelper(node, "sub", "Pasted schemas will appear here as catalog widgets.", 11, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
    sub.resize(200, 10);
    sub.textAutoResize = "HEIGHT";
    
    const btn = figma.createFrame();
    btn.name = "btn";
    btn.layoutMode = "HORIZONTAL";
    btn.paddingLeft = 12; btn.paddingRight = 12;
    btn.paddingTop = 4; btn.paddingBottom = 4;
    btn.cornerRadius = 4;
    btn.fills = semPaint(figmaVarsMap, "action/secondary/default", { r: 0.92, g: 0.92, b: 0.94 });
    await createTextHelper(btn, "text", "Import Files", 10.5, null, "Inter", "Medium", figmaVarsMap);
    node.appendChild(btn);

  } else if (componentId === "codeBlock") {
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "FIXED";
    node.resize(240, 100);
    node.paddingTop = 12; node.paddingBottom = 12;
    node.paddingLeft = 12; node.paddingRight = 12;
    node.cornerRadius = 6;
    node.fills = semPaint(figmaVarsMap, "surface/sunken", { r: 0.09, g: 0.09, b: 0.11 });

    await createTextHelper(node, "line1", "const sync = new Arkitype();", 11, { type: "LITERAL", value: "#c084fc" }, "Courier New", "Regular", figmaVarsMap);
    await createTextHelper(node, "line2", "sync.variables.apply();", 11, { type: "LITERAL", value: "#818cf8" }, "Courier New", "Regular", figmaVarsMap);
  }
}

async function drawStats(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.itemSpacing = 4;
  node.primaryAxisAlignItems = "MIN";
  node.counterAxisAlignItems = "MIN";

  if (componentId === "stat") {
    await createTextHelper(node, "label", "Monthly Revenue", 11, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Medium", figmaVarsMap);
    
    const valueRow = figma.createFrame();
    valueRow.layoutMode = "HORIZONTAL";
    valueRow.itemSpacing = 8;
    valueRow.fills = [];
    valueRow.primaryAxisSizingMode = "AUTO";
    valueRow.counterAxisSizingMode = "AUTO";
    
    await createTextHelper(valueRow, "value", "$45,210.00", 20, styles["text.color"], "Inter", "Bold", figmaVarsMap);
    await createTextHelper(valueRow, "trend", "▲ 12.4%", 10, sem("feedback/success/text"), "Inter", "Bold", figmaVarsMap);
    
    node.appendChild(valueRow);
  } else {
    node.layoutMode = "HORIZONTAL";
    node.itemSpacing = 24;
    
    const stat1 = figma.createFrame();
    stat1.layoutMode = "VERTICAL";
    stat1.itemSpacing = 4;
    stat1.fills = [];
    await createTextHelper(stat1, "label", "Subscribers", 11, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Medium", figmaVarsMap);
    await createTextHelper(stat1, "value", "12.8K", 18, styles["text.color"], "Inter", "Bold", figmaVarsMap);
    node.appendChild(stat1);

    const stat2 = figma.createFrame();
    stat2.layoutMode = "VERTICAL";
    stat2.itemSpacing = 4;
    stat2.fills = [];
    await createTextHelper(stat2, "label", "Bounce Rate", 11, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Medium", figmaVarsMap);
    await createTextHelper(stat2, "value", "42.1%", 18, styles["text.color"], "Inter", "Bold", figmaVarsMap);
    node.appendChild(stat2);
  }
}

async function drawAdvancedControls(
  node: ComponentNode, 
  styles: any, 
  options: any, 
  componentId: string, 
  state: string, 
  figmaVarsMap: Map<string, Variable>
) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 8;

  if (componentId === "stepper") {
    const btnMinus = figma.createFrame();
    btnMinus.primaryAxisSizingMode = "FIXED";
    btnMinus.counterAxisSizingMode = "FIXED";
    btnMinus.resize(24, 24);
    btnMinus.cornerRadius = 4;
    btnMinus.layoutMode = "HORIZONTAL";
    btnMinus.primaryAxisAlignItems = "CENTER";
    btnMinus.counterAxisAlignItems = "CENTER";
    btnMinus.fills = semPaint(figmaVarsMap, "action/secondary/default", { r: 0.92, g: 0.92, b: 0.94 });
    await createTextHelper(btnMinus, "text", "−", 12, null, "Inter", "Bold", figmaVarsMap);
    node.appendChild(btnMinus);
    
    await createTextHelper(node, "value", "01", 13, styles["text.color"], "Courier New", "Regular", figmaVarsMap);

    const btnPlus = figma.createFrame();
    btnPlus.primaryAxisSizingMode = "FIXED";
    btnPlus.counterAxisSizingMode = "FIXED";
    btnPlus.resize(24, 24);
    btnPlus.cornerRadius = 4;
    btnPlus.layoutMode = "HORIZONTAL";
    btnPlus.primaryAxisAlignItems = "CENTER";
    btnPlus.counterAxisAlignItems = "CENTER";
    btnPlus.fills = semPaint(figmaVarsMap, "action/secondary/default", { r: 0.92, g: 0.92, b: 0.94 });
    await createTextHelper(btnPlus, "text", "+", 12, null, "Inter", "Bold", figmaVarsMap);
    node.appendChild(btnPlus);

  } else if (componentId === "buttonGroup") {
    node.itemSpacing = 0;
    
    for (const label of ["Left", "Center", "Right"]) {
      const btn = figma.createFrame();
      btn.layoutMode = "HORIZONTAL";
      btn.paddingLeft = 12; btn.paddingRight = 12;
      btn.paddingTop = 6; btn.paddingBottom = 6;
      btn.fills = [];
      btn.strokes = semPaint(figmaVarsMap, "border/default", { r: 0.87, g: 0.87, b: 0.9 });

      const active = label === "Left";
      if (active) {
        btn.fills = semPaint(figmaVarsMap, "surface/subtle", { r: 0.93, g: 0.93, b: 0.95 });
      }
      
      await createTextHelper(btn, "label", label, 11.5, active ? styles["text.color"] : { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", active ? "Bold" : "Regular", figmaVarsMap);
      node.appendChild(btn);
    }

  } else if (componentId === "field") {
    node.layoutMode = "VERTICAL";
    node.itemSpacing = 6;
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "AUTO";
    node.resize(200, node.height);
    node.counterAxisAlignItems = "MIN";

    await createTextHelper(node, "label", "Email Address", 11.5, styles["text.color"], "Inter", "Bold", figmaVarsMap);
    
    const input = figma.createFrame();
    input.name = "input";
    input.layoutMode = "HORIZONTAL";
    input.paddingLeft = 8; input.paddingRight = 8;
    input.paddingTop = 6; input.paddingBottom = 6;
    input.cornerRadius = 4;
    input.fills = semPaint(figmaVarsMap, "surface/elevated", { r: 0.98, g: 0.98, b: 0.99 });
    input.strokes = semPaint(figmaVarsMap, "border/default", { r: 0.87, g: 0.87, b: 0.9 });
    
    await createTextHelper(input, "text", "name@example.com", 11, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
    node.appendChild(input);

    await createTextHelper(node, "helpText", "Required for notification logs.", 10, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
  }
}

async function drawStatusIndicators(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  
  if (componentId === "spinner") {
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "FIXED";
    node.resize(16, 16);

    const ring = figma.createEllipse();
    ring.name = "ring";
    ring.resize(16, 16);
    ring.strokes = semPaint(figmaVarsMap, "action/primary/default", { r: 0.38, g: 0.4, b: 0.95 });
    ring.strokeWeight = 2;
    ring.dashPattern = [4, 4];
    node.appendChild(ring);

  } else if (componentId === "skeleton") {
    node.layoutMode = "VERTICAL";
    node.itemSpacing = 8;
    
    for (const width of [140, 100, 120]) {
      const line = figma.createFrame();
      line.primaryAxisSizingMode = "FIXED";
      line.counterAxisSizingMode = "FIXED";
      line.resize(width, 10);
      line.cornerRadius = 4;
      line.fills = semPaint(figmaVarsMap, "surface/subtle", { r: 0.92, g: 0.92, b: 0.94 });
      node.appendChild(line);
    }

  } else if (componentId === "kbd") {
    node.paddingLeft = 6; node.paddingRight = 6;
    node.paddingTop = 3; node.paddingBottom = 3;
    node.cornerRadius = 4;
    node.fills = semPaint(figmaVarsMap, "surface/subtle", { r: 0.95, g: 0.95, b: 0.96 });
    node.strokes = semPaint(figmaVarsMap, "border/strong", { r: 0.78, g: 0.78, b: 0.82 });
    node.strokeWeight = 1;
    
    await createTextHelper(node, "key", "Ctrl", 10.5, styles["text.color"], "Courier New", "Bold", figmaVarsMap);
  }
}

async function drawFallback(node: ComponentNode, componentId: string) {
  const placeholderText = figma.createText();
  placeholderText.name = "placeholder";
  placeholderText.characters = componentId.toUpperCase();
  placeholderText.fontName = await loadFontSafe("Inter", "Bold");
  placeholderText.fontSize = 12;
  placeholderText.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
  node.appendChild(placeholderText);
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.resize(100, 32);
}

// Draw Link helper
async function drawLink(node: ComponentNode, styles: any, options: any, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 4;
  node.primaryAxisAlignItems = "MIN";
  node.counterAxisAlignItems = "CENTER";
  
  const text = await createTextHelper(
    node, 
    "label", 
    options.label || "Link Action ➔", 
    12.5, 
    styles["text.color"] || { type: "ALIAS", collection: "Semantics", path: "action/primary/default" }, 
    "Inter", 
    "Medium", 
    figmaVarsMap
  );
  text.textDecoration = "UNDERLINE";
}
