import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#f8f8f8",
        card: "#171717",
        "card-foreground": "#f8f8f8",
        primary: "#9333ea",
        "primary-foreground": "#ffffff",
        secondary: "#262626",
        muted: "#262626",
        "muted-foreground": "#a3a3a3",
        accent: "#eab308",
        danger: "#b91c1c",
        success: "#22c55e",
        border: "#262626",
        // Semantic theme-aware colors (CSS variables)
        "c-bg": "var(--c-bg)",
        "c-card": "var(--c-card)",
        "c-input": "var(--c-input)",
        "c-border": "var(--c-border)",
        "c-text": "var(--c-text)",
        "c-muted": "var(--c-muted)",
        "c-subtle": "var(--c-subtle)",
        "c-nav": "var(--c-nav)",
        "c-success-bg": "var(--c-success-bg)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
