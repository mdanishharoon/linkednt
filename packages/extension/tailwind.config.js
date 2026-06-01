/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx,html}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // UI-SPEC.md §Color — 9 tokens, dark-first
        dominant: { DEFAULT: "#0f0f10", light: "#f8f8f8" },
        secondary: { DEFAULT: "#1a1a1f", light: "#ffffff" },
        accent: { DEFAULT: "#6366f1" },
        destructive: { DEFAULT: "#ef4444" },
        success: { DEFAULT: "#22c55e" },
        warning: { DEFAULT: "#f59e0b" },
        "text-primary": { DEFAULT: "#f1f1f3", light: "#111113" },
        "text-secondary": { DEFAULT: "#8b8b9a", light: "#6b6b7a" },
        "token-border": { DEFAULT: "#2a2a35", light: "#e2e2ea" },
      },
      fontFamily: {
        // UI-SPEC.md §Typography — system stack
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "sans-serif",
        ],
      },
      fontSize: {
        // UI-SPEC.md §Typography — explicit roles
        label: ["12px", { lineHeight: "1.4", fontWeight: "400" }],
        body: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        heading: ["16px", { lineHeight: "1.25", fontWeight: "600" }],
        display: ["20px", { lineHeight: "1.2", fontWeight: "600" }],
      },
      spacing: {
        // UI-SPEC.md §Spacing Scale (xs through 2xl)
        "token-xs": "4px",
        "token-sm": "8px",
        "token-md": "16px",
        "token-lg": "24px",
        "token-xl": "32px",
        "token-2xl": "48px",
      },
      minHeight: {
        touch: "44px", // WCAG 2.5.5 minimum touch target — UI-SPEC.md §Accessibility
      },
    },
  },
  plugins: [],
};
