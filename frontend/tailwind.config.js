/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "var(--accent)",
        background: "var(--bg)",
        foreground: "var(--text)",
        surface: {
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        card: {
          DEFAULT: "var(--card-bg)",
          foreground: "var(--text)",
        },
        border: "var(--border)",
        input: "var(--input-bg)",
        ring: "var(--accent)",
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        secondary: {
          DEFAULT: "var(--card-bg)",
          foreground: "var(--text)",
        },
        muted: {
          DEFAULT: "var(--muted-bg)",
          foreground: "var(--muted-text)",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "var(--success)",
          bg: "var(--success-bg)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          bg: "var(--warning-bg)",
        },
        error: {
          DEFAULT: "var(--error)",
          bg: "var(--error-bg)",
        },
        popover: {
          DEFAULT: "var(--surface-1)",
          foreground: "var(--text)",
        },
        sidebar: "var(--sidebar-bg)",
      },
      fontFamily: {
        sans: ["var(--font)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        xl: "var(--radius)",
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
        full: "9999px",
      },
      boxShadow: {
        xs:  "var(--shadow-xs)",
        sm:  "var(--shadow-sm)",
        md:  "var(--shadow-md)",
        lg:  "var(--shadow-lg)",
        xl:  "var(--shadow-xl)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "350ms",
      },
      spacing: {
        sidebar: "var(--sidebar-width)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        shimmer:          "shimmer 1.5s infinite",
        "fade-in":        "fade-in 0.25s ease both",
        "slide-in-left":  "slide-in-left 0.2s ease both",
        "scale-in":       "scale-in 0.15s ease both",
      },
    },
  },
  plugins: [],
}
