import type { Settings } from "@/types"

const FONT_URLS: Record<string, string> = {
  Inter: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  Outfit: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap",
  Poppins: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap",
  Roboto: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap",
  "JetBrains Mono": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap",
}

const DARK_TOKENS: Record<string, string> = {
  "--app-bg": "#07090f",
  "--bg": "#0b0d14",
  "--surface-1": "#11141d",
  "--surface-2": "#171c27",
  "--surface-3": "#202737",
  "--surface-4": "#2a3347",
  "--sidebar-bg": "#0b0e14",
  "--rail-bg": "#090c12",
  "--rail-active-bg": "rgba(255,255,255,0.06)",
  "--rail-icon-color": "#7c8498",
  "--rail-icon-active": "#eef4fb",
  "--panel-bg": "#11151f",
  "--panel-border": "rgba(255,255,255,0.07)",
  "--panel-icon-bg": "rgba(255,255,255,0.05)",
  "--main-surface": "#0f131d",
  "--main-border": "rgba(255,255,255,0.08)",
  "--text": "#eef2f7",
  "--text-secondary": "#c1c9d6",
  "--muted-text": "#8b93a7",
  "--muted-text-light": "#616980",
  "--border": "rgba(255,255,255,0.08)",
  "--border-strong": "rgba(255,255,255,0.14)",
  "--card-bg": "rgba(18,23,33,0.92)",
  "--card-border": "rgba(255,255,255,0.08)",
  "--input-bg": "rgba(255,255,255,0.04)",
  "--input-border": "rgba(255,255,255,0.1)",
  "--muted-bg": "rgba(255,255,255,0.05)",
  "--hover-bg": "rgba(255,255,255,0.06)",
  "--shadow-xs": "0 1px 2px rgba(0,0,0,0.22)",
  "--shadow-sm": "0 14px 30px rgba(0,0,0,0.18)",
  "--shadow-md": "0 24px 56px rgba(0,0,0,0.26)",
  "--shadow-lg": "0 34px 74px rgba(0,0,0,0.34)",
  "--shadow-xl": "0 44px 96px rgba(0,0,0,0.42)",
  "--shell-shadow": "0 30px 70px rgba(0,0,0,0.38)",
  "--main-shadow": "inset 0 1px 0 rgba(255,255,255,0.03), 0 36px 80px rgba(0,0,0,0.28)",
  "--success": "#4ade80",
  "--success-bg": "rgba(74,222,128,0.1)",
  "--warning": "#fbbf24",
  "--warning-bg": "rgba(251,191,36,0.12)",
  "--error": "#f87171",
  "--error-bg": "rgba(248,113,113,0.12)",
  "--info": "#60a5fa",
  "--info-bg": "rgba(96,165,250,0.12)",
}

const LIGHT_TOKENS: Record<string, string> = {
  "--app-bg": "#eef1f7",
  "--bg": "#f4f7fb",
  "--surface-1": "#ffffff",
  "--surface-2": "#f4f6fb",
  "--surface-3": "#e9edf6",
  "--surface-4": "#d9e0ef",
  "--sidebar-bg": "#ffffff",
  "--rail-bg": "#edf2fb",
  "--rail-active-bg": "rgba(15,23,42,0.08)",
  "--rail-icon-color": "#64748b",
  "--rail-icon-active": "#0f172a",
  "--panel-bg": "#f8faff",
  "--panel-border": "rgba(15,23,42,0.09)",
  "--panel-icon-bg": "rgba(15,23,42,0.06)",
  "--main-surface": "#ffffff",
  "--main-border": "rgba(15,23,42,0.08)",
  "--text": "#0f172a",
  "--text-secondary": "#334155",
  "--muted-text": "#64748b",
  "--muted-text-light": "#94a3b8",
  "--border": "rgba(15,23,42,0.08)",
  "--border-strong": "rgba(15,23,42,0.14)",
  "--card-bg": "rgba(255,255,255,0.96)",
  "--card-border": "rgba(15,23,42,0.08)",
  "--input-bg": "#ffffff",
  "--input-border": "rgba(15,23,42,0.12)",
  "--muted-bg": "rgba(15,23,42,0.04)",
  "--hover-bg": "rgba(15,23,42,0.06)",
  "--shadow-xs": "0 1px 2px rgba(15,23,42,0.06)",
  "--shadow-sm": "0 14px 30px rgba(15,23,42,0.08)",
  "--shadow-md": "0 24px 56px rgba(15,23,42,0.1)",
  "--shadow-lg": "0 34px 74px rgba(15,23,42,0.12)",
  "--shadow-xl": "0 44px 96px rgba(15,23,42,0.14)",
  "--shell-shadow": "0 24px 60px rgba(15,23,42,0.1)",
  "--main-shadow": "inset 0 1px 0 rgba(255,255,255,0.7), 0 28px 68px rgba(15,23,42,0.08)",
  "--success": "#16a34a",
  "--success-bg": "rgba(22,163,74,0.1)",
  "--warning": "#d97706",
  "--warning-bg": "rgba(217,119,6,0.12)",
  "--error": "#dc2626",
  "--error-bg": "rgba(220,38,38,0.12)",
  "--info": "#2563eb",
  "--info-bg": "rgba(37,99,235,0.12)",
}

function applyTokenSet(root: HTMLElement, tokens: Record<string, string>) {
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

export function applyTheme(settings: Pick<Settings, "theme_mode" | "theme_accent" | "theme_font">) {
  const root = document.documentElement
  const isDark = settings.theme_mode === "Scuro"
  const accent = settings.theme_accent || "#1cc123"
  const fontName = settings.theme_font || "Outfit"

  applyTokenSet(root, isDark ? DARK_TOKENS : LIGHT_TOKENS)
  root.classList.toggle("dark", isDark)

  root.style.setProperty("--accent", accent)
  root.style.setProperty("--accent-hover", `color-mix(in srgb, ${accent} 82%, ${isDark ? "white" : "black"})`)
  root.style.setProperty("--accent-subtle", `color-mix(in srgb, ${accent} ${isDark ? "14%" : "12%"}, transparent)`)
  root.style.setProperty("--accent-foreground", "#ffffff")
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
