import type { Config } from "tailwindcss";

/**
 * Chrome palette: strictly monochrome, and now theme-aware. Tokens resolve to
 * CSS custom properties (channel form, so `/opacity` modifiers keep working)
 * that flip between light (`:root`) and dark (`.dark`) in globals.css. The only
 * *colour* on screen is still the design system the user is building — the tool
 * itself stays greyscale, it just picks a light or dark greyscale.
 *
 * `ink`  = surfaces (page → panels → raised), lightest in light mode.
 * `fg`   = text (primary → dim → mute), darkest in light mode.
 * The luminance flips per theme, so semantic inverse pairs like `bg-fg text-ink`
 * (primary buttons) stay high-contrast in both.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "rgb(var(--c-ink) / <alpha-value>)", // page
          panel: "rgb(var(--c-ink-panel) / <alpha-value>)", // sunken panels, inputs
          raised: "rgb(var(--c-ink-raised) / <alpha-value>)", // raised cards, popovers
          hover: "rgb(var(--c-ink-hover) / <alpha-value>)", // interactive hover wash
        },
        line: {
          DEFAULT: "rgb(var(--c-line) / <alpha-value>)", // hairline dividers
          strong: "rgb(var(--c-line-strong) / <alpha-value>)", // emphasised borders
        },
        fg: {
          DEFAULT: "rgb(var(--c-fg) / <alpha-value>)", // primary text
          dim: "rgb(var(--c-fg-dim) / <alpha-value>)", // secondary text
          mute: "rgb(var(--c-fg-mute) / <alpha-value>)", // tertiary / labels
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "sans-serif",
        ],
        display: [
          "var(--font-display)",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      keyframes: {
        'rotate-mesh': {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(180deg) scale(1.15)' },
          '100%': { transform: 'rotate(360deg) scale(1)' },
        }
      },
      animation: {
        'mesh-spin': 'rotate-mesh 30s linear infinite',
      }
    },
  },
  plugins: [],
};

export default config;
