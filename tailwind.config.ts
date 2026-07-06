import type { Config } from "tailwindcss";

/**
 * Chrome palette: strictly monochrome. The only colour on screen should be
 * the design system the user is building — never the tool itself.
 */
const config: Config = {
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
          DEFAULT: "#0c0c0d", // page
          panel: "#121214", // sunken panels, inputs
          raised: "#18181b", // raised cards, popovers
          hover: "#1e1e21", // interactive hover wash
        },
        line: {
          DEFAULT: "#232327", // hairline dividers
          strong: "#2e2e33", // emphasised borders
        },
        fg: {
          DEFAULT: "#f4f4f5", // primary text
          dim: "#a1a1aa", // secondary text
          mute: "#6e6e76", // tertiary / labels
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
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
