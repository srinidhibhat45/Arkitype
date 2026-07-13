/**
 * The design system's icon library — Material Symbols (Google, Apache-2.0),
 * the modern successor to Material Icons (~3,600 icons, actively maintained).
 *
 * This is the one source of truth shared by every surface that touches icons:
 *   • the app renders glyphs from the font loaded in app/globals.css;
 *   • the CSS + handoff exports emit the setup below so a consuming app renders
 *     the exact same markup;
 *   • the Figma bundle carries the icon inventory so the plugin can build a
 *     swappable icon library page.
 */
import type { ArkitypeState } from "@/store/useDesignSystem";

export const ICON_LIBRARY = {
  id: "material-symbols",
  name: "Material Symbols",
  variant: "Outlined",
  /** CSS class the markup renders a ligature glyph through (app + exports). */
  className: "material-symbols-outlined",
  fontFamily: "Material Symbols Outlined",
  license: "Apache-2.0",
  npm: "material-symbols",
  docsUrl: "https://fonts.google.com/icons",
  cssImport:
    "@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');",
} as const;

/** The `.material-symbols-outlined` helper class — the same rule app/globals.css
 *  ships, emitted verbatim into exports so consumer markup renders identically. */
export const ICON_FONT_CSS = `.${ICON_LIBRARY.className} {
  font-family: '${ICON_LIBRARY.fontFamily}';
  font-weight: normal;
  font-style: normal;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}`;

/** True when an option/slot key names an icon (prefixIcon, suffixIcon, icon…). */
function isIconKey(key: string): boolean {
  return /icon$/i.test(key);
}

/**
 * Every distinct icon ligature the system actually uses, gathered from every
 * component's stored properties and per-slot instance content. Sorted, deduped.
 */
export function collectUsedIcons(state: ArkitypeState): string[] {
  const found = new Set<string>();
  const scan = (bag: Record<string, string | number | boolean> | undefined) => {
    if (!bag) return;
    for (const [key, value] of Object.entries(bag)) {
      if (typeof value !== "string") continue;
      const name = value.trim();
      if (!name || name === "true" || name === "false") continue;
      if (isIconKey(key)) found.add(name);
    }
  };
  for (const cfg of Object.values(state.components ?? {})) {
    scan(cfg.properties);
    for (const slot of Object.values(cfg.instances ?? {})) scan(slot);
  }
  return Array.from(found).sort();
}

/** Markdown "Icons" section for the handoff doc: library, setup, inventory.
 *  `heading` lets the caller slot it into a numbered document ("## 7. Icons"). */
export function iconSectionMarkdown(usedIcons: string[], heading = "## Icons"): string[] {
  const lines: string[] = [];
  lines.push(heading);
  lines.push("");
  lines.push(
    `Icons come from **${ICON_LIBRARY.name}** (${ICON_LIBRARY.variant}, ${ICON_LIBRARY.license}) — Google's open-source library of ~3,600 icons. Every icon slot in this system stores a ligature name (e.g. \`search\`), rendered through the \`.${ICON_LIBRARY.className}\` font class so no per-icon assets ship.`
  );
  lines.push("");
  lines.push(`### Install`);
  lines.push("");
  lines.push("```bash");
  lines.push(`npm install ${ICON_LIBRARY.npm}`);
  lines.push("```");
  lines.push("");
  lines.push(`Or load it from Google Fonts with the same import the tokens CSS carries:`);
  lines.push("");
  lines.push("```css");
  lines.push(ICON_LIBRARY.cssImport);
  lines.push("```");
  lines.push("");
  lines.push(`### Usage`);
  lines.push("");
  lines.push("```html");
  lines.push(`<span class="${ICON_LIBRARY.className}">search</span>`);
  lines.push("```");
  lines.push("");
  lines.push(
    `Browse and copy ligature names at ${ICON_LIBRARY.docsUrl}. The \`.${ICON_LIBRARY.className}\` helper class is included in the CSS custom-properties artifact.`
  );
  lines.push("");
  if (usedIcons.length) {
    lines.push(`### Icons in use (${usedIcons.length})`);
    lines.push("");
    lines.push(usedIcons.map((n) => `\`${n}\``).join(" · "));
    lines.push("");
  }
  return lines;
}
