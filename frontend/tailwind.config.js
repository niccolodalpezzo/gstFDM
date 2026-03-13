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
        card: {
          DEFAULT: "var(--card-bg)",
          foreground: "var(--text)",
        },
        border: "var(--border)",
        input: "var(--input-bg)",
        ring: "var(--accent)",
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "#ffffff",
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
        popover: {
          DEFAULT: "var(--card-bg)",
          foreground: "var(--text)",
        },
      },
      fontFamily: {
        sans: ["var(--font)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [],
}
