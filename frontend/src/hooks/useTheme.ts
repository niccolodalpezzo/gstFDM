import type { Settings } from "@/types"

const FONT_URLS: Record<string, string> = {
  Inter: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  Outfit: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap",
  Poppins: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap",
  Roboto: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap",
  "JetBrains Mono": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap",
}

export function applyTheme(settings: Pick<Settings, "theme_mode" | "theme_accent" | "theme_font">) {
  const root = document.documentElement
  const isDark = settings.theme_mode === "Scuro"
  const accent = settings.theme_accent || "#1cc123"

  root.style.setProperty("--accent", accent)
  root.style.setProperty("--accent-hover", `color-mix(in srgb, ${accent} 85%, ${isDark ? "white" : "black"})`)
  root.style.setProperty("--accent-subtle", `color-mix(in srgb, ${accent} ${isDark ? "12%" : "10%"}, transparent)`)

  if (isDark) {
    root.style.setProperty("--bg", "#0d0e14")
    root.style.setProperty("--surface-1", "#13141d")
    root.style.setProperty("--surface-2", "#1a1b26")
    root.style.setProperty("--surface-3", "#21222e")
    root.style.setProperty("--sidebar-bg", "#111219")
    root.style.setProperty("--text", "#e8eaf0")
    root.style.setProperty("--text-secondary", "#c4c8d8")
    root.style.setProperty("--muted-text", "#8b92a8")
    root.style.setProperty("--muted-text-light", "#5c6380")
    root.style.setProperty("--border", "rgba(255,255,255,0.07)")
    root.style.setProperty("--border-strong", "rgba(255,255,255,0.13)")
    root.style.setProperty("--card-bg", "rgba(26,27,38,0.95)")
    root.style.setProperty("--card-border", "rgba(255,255,255,0.06)")
    root.style.setProperty("--input-bg", "rgba(255,255,255,0.05)")
    root.style.setProperty("--muted-bg", "rgba(255,255,255,0.04)")
    root.style.setProperty("--shadow-xs", "0 1px 2px rgba(0,0,0,0.25)")
    root.style.setProperty("--shadow-sm", "0 1px 3px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.25)")
    root.style.setProperty("--shadow-md", "0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -1px rgba(0,0,0,0.3)")
    root.style.setProperty("--shadow-lg", "0 10px 15px -3px rgba(0,0,0,0.45), 0 4px 6px -2px rgba(0,0,0,0.3)")
    root.style.setProperty("--shadow-xl", "0 20px 25px -5px rgba(0,0,0,0.5), 0 10px 10px -5px rgba(0,0,0,0.3)")
    root.style.setProperty("--success", "#4ade80")
    root.style.setProperty("--success-bg", "rgba(74,222,128,0.08)")
    root.style.setProperty("--warning", "#fbbf24")
    root.style.setProperty("--warning-bg", "rgba(251,191,36,0.08)")
    root.style.setProperty("--error", "#f87171")
    root.style.setProperty("--error-bg", "rgba(248,113,113,0.08)")
    root.classList.add("dark")
  } else {
    root.style.setProperty("--bg", "#f4f5f7")
    root.style.setProperty("--surface-1", "#ffffff")
    root.style.setProperty("--surface-2", "#f8f9fa")
    root.style.setProperty("--surface-3", "#f1f3f5")
    root.style.setProperty("--sidebar-bg", "#ffffff")
    root.style.setProperty("--text", "#0f1117")
    root.style.setProperty("--text-secondary", "#374151")
    root.style.setProperty("--muted-text", "#6b7280")
    root.style.setProperty("--muted-text-light", "#9ca3af")
    root.style.setProperty("--border", "rgba(0,0,0,0.07)")
    root.style.setProperty("--border-strong", "rgba(0,0,0,0.14)")
    root.style.setProperty("--card-bg", "#ffffff")
    root.style.setProperty("--card-border", "rgba(0,0,0,0.06)")
    root.style.setProperty("--input-bg", "#ffffff")
    root.style.setProperty("--muted-bg", "rgba(0,0,0,0.03)")
    root.style.setProperty("--shadow-xs", "0 1px 2px rgba(0,0,0,0.04)")
    root.style.setProperty("--shadow-sm", "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)")
    root.style.setProperty("--shadow-md", "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)")
    root.style.setProperty("--shadow-lg", "0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)")
    root.style.setProperty("--shadow-xl", "0 20px 25px -5px rgba(0,0,0,0.08), 0 10px 10px -5px rgba(0,0,0,0.03)")
    root.style.setProperty("--success", "#16a34a")
    root.style.setProperty("--success-bg", "#f0fdf4")
    root.style.setProperty("--warning", "#d97706")
    root.style.setProperty("--warning-bg", "#fffbeb")
    root.style.setProperty("--error", "#dc2626")
    root.style.setProperty("--error-bg", "#fef2f2")
    root.classList.remove("dark")
  }

  const fontName = settings.theme_font || "Inter"
  root.style.setProperty("--font", `'${fontName}', system-ui, sans-serif`)

  const url = FONT_URLS[fontName]
  if (url) {
    let link = document.getElementById("gfont") as HTMLLinkElement | null
    if (!link) {
      link = document.createElement("link")
      link.id = "gfont"
      link.rel = "stylesheet"
      document.head.appendChild(link)
    }
    link.href = url
  }
}
