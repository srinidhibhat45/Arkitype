/**
 * lib/googleFonts.ts
 * Curated list of popular Google Fonts, pairing presets, and URL builder.
 */

export type FontCategory = "sans-serif" | "serif" | "mono" | "display";

export interface GoogleFont {
  family: string;
  category: FontCategory;
  weights: number[];
}

export interface FontPairing {
  label: string;
  description: string;
  display: string;
  heading: string;
  body: string;
  mono: string;
}

export const GOOGLE_FONTS: GoogleFont[] = [
  // Sans-serif
  { family: "Inter", category: "sans-serif", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "Geist", category: "sans-serif", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "Roboto", category: "sans-serif", weights: [100,300,400,500,700,900] },
  { family: "Open Sans", category: "sans-serif", weights: [300,400,500,600,700,800] },
  { family: "Lato", category: "sans-serif", weights: [100,300,400,700,900] },
  { family: "Nunito", category: "sans-serif", weights: [200,300,400,500,600,700,800,900] },
  { family: "Nunito Sans", category: "sans-serif", weights: [200,300,400,500,600,700,800,900] },
  { family: "Poppins", category: "sans-serif", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "Outfit", category: "sans-serif", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "DM Sans", category: "sans-serif", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "Figtree", category: "sans-serif", weights: [300,400,500,600,700,800,900] },
  { family: "Plus Jakarta Sans", category: "sans-serif", weights: [200,300,400,500,600,700,800] },
  { family: "Work Sans", category: "sans-serif", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "Manrope", category: "sans-serif", weights: [200,300,400,500,600,700,800] },
  { family: "Raleway", category: "sans-serif", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "Mulish", category: "sans-serif", weights: [200,300,400,500,600,700,800,900] },
  { family: "Urbanist", category: "sans-serif", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "Sora", category: "sans-serif", weights: [100,200,300,400,500,600,700,800] },
  { family: "Be Vietnam Pro", category: "sans-serif", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "Source Sans 3", category: "sans-serif", weights: [200,300,400,500,600,700,800,900] },
  { family: "IBM Plex Sans", category: "sans-serif", weights: [100,200,300,400,500,600,700] },
  { family: "Karla", category: "sans-serif", weights: [200,300,400,500,600,700,800] },
  { family: "Jost", category: "sans-serif", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "Hind", category: "sans-serif", weights: [300,400,500,600,700] },
  { family: "Rubik", category: "sans-serif", weights: [300,400,500,600,700,800,900] },
  { family: "Montserrat", category: "sans-serif", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "Lexend", category: "sans-serif", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "Noto Sans", category: "sans-serif", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "Albert Sans", category: "sans-serif", weights: [100,200,300,400,500,600,700,800,900] },
  // Serif
  { family: "Playfair Display", category: "serif", weights: [400,500,600,700,800,900] },
  { family: "Merriweather", category: "serif", weights: [300,400,700,900] },
  { family: "Lora", category: "serif", weights: [400,500,600,700] },
  { family: "Source Serif 4", category: "serif", weights: [200,300,400,600,700,900] },
  { family: "PT Serif", category: "serif", weights: [400,700] },
  { family: "Noto Serif", category: "serif", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "Libre Baskerville", category: "serif", weights: [400,700] },
  { family: "Crimson Text", category: "serif", weights: [400,600,700] },
  { family: "EB Garamond", category: "serif", weights: [400,500,600,700,800] },
  { family: "Cormorant Garamond", category: "serif", weights: [300,400,500,600,700] },
  { family: "Spectral", category: "serif", weights: [200,300,400,500,600,700,800] },
  { family: "Vollkorn", category: "serif", weights: [400,500,600,700,800,900] },
  { family: "DM Serif Display", category: "serif", weights: [400] },
  { family: "Fraunces", category: "serif", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "Instrument Serif", category: "serif", weights: [400] },
  // Monospace
  { family: "JetBrains Mono", category: "mono", weights: [100,200,300,400,500,600,700,800] },
  { family: "Fira Code", category: "mono", weights: [300,400,500,600,700] },
  { family: "Source Code Pro", category: "mono", weights: [200,300,400,500,600,700,800,900] },
  { family: "IBM Plex Mono", category: "mono", weights: [100,200,300,400,500,600,700] },
  { family: "Roboto Mono", category: "mono", weights: [100,200,300,400,500,600,700] },
  { family: "Space Mono", category: "mono", weights: [400,700] },
  { family: "Geist Mono", category: "mono", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "DM Mono", category: "mono", weights: [300,400,500] },
  { family: "Inconsolata", category: "mono", weights: [200,300,400,500,600,700,800,900] },
  { family: "Courier Prime", category: "mono", weights: [400,700] },
  // Display
  { family: "Bebas Neue", category: "display", weights: [400] },
  { family: "Righteous", category: "display", weights: [400] },
  { family: "Oswald", category: "display", weights: [200,300,400,500,600,700] },
  { family: "Space Grotesk", category: "display", weights: [300,400,500,600,700] },
  { family: "Syne", category: "display", weights: [400,500,600,700,800] },
  { family: "Anton", category: "display", weights: [400] },
  { family: "Archivo Black", category: "display", weights: [400] },
  { family: "Barlow Condensed", category: "display", weights: [100,200,300,400,500,600,700,800,900] },
  { family: "Teko", category: "display", weights: [300,400,500,600,700] },
  { family: "Big Shoulders Display", category: "display", weights: [100,200,300,400,500,600,700,800,900] },
];

const SYSTEM_FONT_NAMES = new Set([
  "Inter","-apple-system","BlinkMacSystemFont","ui-monospace",
  "SF Mono","Menlo","monospace","sans-serif","serif",
]);

export function primaryFamilyName(stack: string): string {
  return stack.split(",")[0].trim().replace(/['"]/g, "");
}

export function isGoogleFont(family: string): boolean {
  const name = primaryFamilyName(family);
  return GOOGLE_FONTS.some((f) => f.family === name) && !SYSTEM_FONT_NAMES.has(name);
}

/** Lowercase alphanumerics only — "Source Code Pro" and "SourceCodePro" collide. */
const simplifyFontName = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Best-effort map from a font name found in the wild (a scraped CSS
 * font-family, often a self-hosted alias like "sohne-var" or a squashed name
 * like "SourceCodePro") to a font we can actually load from Google Fonts.
 * Returns null when the family isn't publicly available — callers should keep
 * their current font rather than apply a name that will never render.
 */
export function matchGoogleFont(raw: string): GoogleFont | null {
  // Drop variable-font suffixes: "sohne-var", "InterVariable", "Roboto VF".
  const name = primaryFamilyName(raw).replace(/[\s_-]*(variable|var|vf)$/i, "").trim();
  const target = simplifyFontName(name);
  if (!target) return null;
  const exact = GOOGLE_FONTS.find((f) => simplifyFontName(f.family) === target);
  if (exact) return exact;
  // "GeistSans" means Geist — but only fall back to the suffix-less family when
  // no catalog font carries the suffix itself (Nunito Sans must stay Nunito Sans).
  const stripped = target.replace(/(sans|serif|text|display)$/, "");
  if (stripped && stripped !== target) {
    return GOOGLE_FONTS.find((f) => simplifyFontName(f.family) === stripped) ?? null;
  }
  return null;
}

export function buildGoogleFontUrl(families: string[]): string | null {
  const unique = Array.from(new Set(families.map(primaryFamilyName))).filter(isGoogleFont);
  if (unique.length === 0) return null;
  const params = unique
    .map((f) => "family=" + encodeURIComponent(f) + ":ital,wght@0,100..900;1,100..900")
    .join("&");
  return "https://fonts.googleapis.com/css2?" + params + "&display=swap";
}

export const FONT_PAIRINGS: FontPairing[] = [
  {
    label: "Modern System",
    description: "Clean, neutral, and universally legible",
    display: "Inter", heading: "Inter", body: "Inter", mono: "JetBrains Mono",
  },
  {
    label: "Editorial",
    description: "Classic serif headlines with a clean reading body",
    display: "Playfair Display", heading: "Playfair Display", body: "Source Sans 3", mono: "JetBrains Mono",
  },
  {
    label: "Geometric Minimal",
    description: "Structured and modern — used by product companies",
    display: "Plus Jakarta Sans", heading: "Plus Jakarta Sans", body: "DM Sans", mono: "DM Mono",
  },
  {
    label: "Literary",
    description: "Refined serif pair for long-form content",
    display: "Cormorant Garamond", heading: "Cormorant Garamond", body: "Lora", mono: "Source Code Pro",
  },
  {
    label: "Humanist",
    description: "Warm and approachable sans combination",
    display: "Nunito", heading: "Nunito", body: "Nunito Sans", mono: "Fira Code",
  },
  {
    label: "Developer-first",
    description: "Sharp and technical with a mono display tone",
    display: "Space Grotesk", heading: "Space Grotesk", body: "Inter", mono: "Fira Code",
  },
  {
    label: "Elegant Contrast",
    description: "Bold display paired with a light reading font",
    display: "Fraunces", heading: "Fraunces", body: "Karla", mono: "IBM Plex Mono",
  },
  {
    label: "Swiss Style",
    description: "Pure geometry inspired by the Helvetica era",
    display: "Outfit", heading: "Outfit", body: "Work Sans", mono: "Roboto Mono",
  },
  {
    label: "Bold Editorial",
    description: "Strong condensed display with clean body",
    display: "Oswald", heading: "Oswald", body: "Open Sans", mono: "Source Code Pro",
  },
  {
    label: "Futurist",
    description: "Variable-weight display with a technical body",
    display: "Syne", heading: "Syne", body: "Manrope", mono: "Geist Mono",
  },
];
