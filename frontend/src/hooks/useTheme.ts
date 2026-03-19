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

  root.style.setProperty("--accent", settings.theme_accent)

  if (isDark) {
    root.style.setProperty("--bg", "#13131a")
    root.style.setProperty("--text", "#e0e0e0")
    root.style.setProperty("--card-bg", "rgba(25,25,32,0.8)")
    root.style.setProperty("--card-border", "rgba(255,255,255,0.06)")
    root.style.setProperty("--border", "rgba(255,255,255,0.1)")
    root.style.setProperty("--input-bg", "rgba(255,255,255,0.06)")
    root.style.setProperty("--muted-bg", "rgba(255,255,255,0.06)")
    root.style.setProperty("--muted-text", "#999999")
    root.style.setProperty("--sidebar-bg", "#1a1a24")
    root.classList.add("dark")
  } else {
    root.style.setProperty("--bg", "#f8f9fa")
    root.style.setProperty("--text", "#111111")
    root.style.setProperty("--card-bg", "rgba(255,255,255,0.9)")
    root.style.setProperty("--card-border", "rgba(0,0,0,0.06)")
    root.style.setProperty("--border", "rgba(0,0,0,0.1)")
    root.style.setProperty("--input-bg", "#ffffff")
    root.style.setProperty("--muted-bg", "rgba(0,0,0,0.04)")
    root.style.setProperty("--muted-text", "#666666")
    root.style.setProperty("--sidebar-bg", "#ffffff")
    root.classList.remove("dark")
  }

  // Font
  const fontName = settings.theme_font || "Inter"
  root.style.setProperty("--font", `'${fontName}', system-ui, sans-serif`)

  // Carica Google Font se necessario
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
