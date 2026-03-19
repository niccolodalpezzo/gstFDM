import { useState, useRef, useEffect } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Printer, Package, Layers, Settings,
  Wrench, BarChart3, Palette, ChevronRight,
  Receipt, RefreshCcw, BarChart2,
  Wind, Hammer, Archive,
  SlidersHorizontal, Scale,
  Users, Truck,
  Briefcase, Building2, Calendar, History, Activity,
  Box, CreditCard, ClipboardList, Cpu, FileText, ShoppingBag,
} from "lucide-react"

// ─── Nav definitions ──────────────────────────────────────────────────────────

type SubItem = {
  to: string
  label: string
  sub: string
  icon?: React.ComponentType<{ className?: string }>
  wip?: boolean
}
type LinkItem   = { parent?: false; to: string; label: string; icon: React.ComponentType<{ className?: string }> }
type ParentItem = { parent: true;  label: string; icon: React.ComponentType<{ className?: string }>; children: SubItem[] }
type NavItem    = LinkItem | ParentItem

const NAV: NavItem[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },

  {
    parent: true, label: "Commerciale", icon: Briefcase,
    children: [
      { to: "/prossimamente/preventivi", label: "Preventivi",  sub: "Offerte e preventivi clienti",  icon: FileText,      wip: true },
      { to: "/progetti",                 label: "Ordini",       sub: "Gestione ordini e progetti",    icon: ClipboardList },
      { to: "/clienti",                  label: "Clienti",      sub: "Anagrafica clienti",            icon: Users },
      { to: "/prossimamente/spedizioni", label: "Spedizioni",   sub: "Tracking e gestione spedizioni",icon: Truck,         wip: true },
    ],
  },

  {
    parent: true, label: "Produzione", icon: Layers,
    children: [
      { to: "/prossimamente/job",             label: "Job",           sub: "Gestione job di stampa",  icon: Cpu,      wip: true },
      { to: "/prossimamente/pianificazione",  label: "Pianificazione",sub: "Calendario produzione",   icon: Calendar, wip: true },
      { to: "/print-log",                     label: "Storico",       sub: "Log stampe completate",   icon: History },
    ],
  },

  {
    parent: true, label: "Stampanti", icon: Printer,
    children: [
      { to: "/stampanti",                  label: "Elenco stampanti", sub: "Fleet management",       icon: Printer },
      { to: "/inventory/components",       label: "Manutenzioni",     sub: "Ricambi e MTBF",         icon: Wrench },
      { to: "/prossimamente/stato-farm",   label: "Stato farm",       sub: "Overview operativo",     icon: Activity, wip: true },
    ],
  },

  {
    parent: true, label: "Magazzino", icon: Package,
    children: [
      { to: "/inventory/filament",          label: "Filamenti",         sub: "Bobine e consumo",           icon: Wind },
      { to: "/inventory/assets",            label: "Componenti",        sub: "Parti e componenti generici", icon: Archive },
      { to: "/inventory/components",        label: "Ricambi stampanti", sub: "Parti di ricambio",          icon: Hammer },
      { to: "/prossimamente/consumabili",   label: "Consumabili",       sub: "Materiali di consumo",       icon: Box,       wip: true },
      { to: "/prossimamente/imballaggi",    label: "Imballaggi",        sub: "Materiali packaging",        icon: Box,       wip: true },
      { to: "/prossimamente/movimenti",     label: "Movimenti",         sub: "Giacenze e movimentazioni",  icon: RefreshCcw,wip: true },
      { to: "/fornitori",                   label: "Acquisti",          sub: "Fornitori e ordini acquisto", icon: ShoppingBag },
    ],
  },

  {
    parent: true, label: "Costi e Report", icon: BarChart3,
    children: [
      { to: "/financial/recurring",         label: "Costi fissi",         sub: "Overhead ricorrenti",      icon: RefreshCcw },
      { to: "/financial/expenses",          label: "Spese straordinarie", sub: "Costi una tantum",         icon: Receipt },
      { to: "/financial/projects",          label: "Pricing",             sub: "Analisi redditività",      icon: BarChart2 },
      { to: "/prossimamente/report",        label: "Report",              sub: "Statistiche e analisi",    icon: BarChart3, wip: true },
    ],
  },

  {
    parent: true, label: "Amministrazione", icon: Building2,
    children: [
      { to: "/prossimamente/fatture",   label: "Fatture",   sub: "Emissione e gestione fatture", icon: FileText,   wip: true },
      { to: "/prossimamente/pagamenti", label: "Pagamenti", sub: "Incassi e pagamenti",          icon: CreditCard, wip: true },
    ],
  },

  {
    parent: true, label: "Impostazioni", icon: Settings,
    children: [
      { to: "/impostazioni/costs",       label: "Parametri farm",        sub: "Energia, lavoro e ammortamento", icon: SlidersHorizontal },
      { to: "/financial/recurring",      label: "Costi fissi struttura", sub: "Configurazione overhead",        icon: RefreshCcw },
      { to: "/impostazioni/tare-config", label: "Config. filamenti",     sub: "Coefficienti consumo e tara",   icon: Scale },
      { to: "/impostazioni/appearance",  label: "Aspetto",               sub: "Tema, font e colori",            icon: Palette },
    ],
  },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const location = useLocation()
  const [flyout, setFlyout]       = useState<string | null>(null)
  const [flyoutTop, setFlyoutTop] = useState(0)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setFlyout(null) }, [location.pathname])

  const clearClose   = () => { if (closeTimer.current) clearTimeout(closeTimer.current) }
  const scheduleClose = () => { closeTimer.current = setTimeout(() => setFlyout(null), 180) }

  const handleParentEnter = (label: string, e: React.MouseEvent<HTMLButtonElement>) => {
    clearClose()
    const rect = e.currentTarget.getBoundingClientRect()
    setFlyoutTop(rect.top)
    setFlyout(label)
  }

  const activeStyle = { background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }
  const baseCls = "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"

  return (
    <>
      <aside
        className="hidden md:flex flex-col w-56 min-h-screen border-r p-4 gap-1 shrink-0"
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)" }}
      >
        <div className="px-2 py-4 mb-2">
          <h1 className="text-lg font-bold" style={{ color: "var(--accent)" }}>PrintFarm</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>Arena Plast</p>
        </div>

        {NAV.map(item => {
          if (item.parent) {
            const isChildActive = item.children.some(c =>
              c.to !== "/prossimamente" && location.pathname.startsWith(c.to.split("?")[0])
            )
            const isOpen = flyout === item.label
            return (
              <button
                key={item.label}
                onMouseEnter={e => handleParentEnter(item.label, e)}
                onMouseLeave={scheduleClose}
                className={cn(baseCls, "w-full text-left", isChildActive || isOpen ? "font-medium" : "opacity-70 hover:opacity-100")}
                style={isChildActive || isOpen ? activeStyle : undefined}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                <ChevronRight className="h-3 w-3 ml-auto opacity-50" />
              </button>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(baseCls, isActive ? "font-medium" : "opacity-70 hover:opacity-100 hover:bg-muted")
              }
              style={({ isActive }) => isActive ? activeStyle : undefined}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          )
        })}
      </aside>

      {/* ── Flyout Panel ── */}
      {flyout && (() => {
        const parent = NAV.find(n => n.parent && n.label === flyout) as ParentItem | undefined
        if (!parent) return null

        return (
          <div
            className="fixed z-50 w-64 rounded-xl border shadow-2xl overflow-hidden"
            style={{
              left: 224,
              top: flyoutTop,
              maxHeight: "calc(100vh - 24px)",
              overflowY: "auto",
              background: "var(--card-bg)",
              borderColor: "var(--card-border)",
            }}
            onMouseEnter={clearClose}
            onMouseLeave={scheduleClose}
          >
            <div
              className="px-4 py-2.5 border-b sticky top-0"
              style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--accent) 6%, var(--card-bg))" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
                {parent.label}
              </p>
            </div>

            {parent.children.map(child => {
              const Icon = child.icon
              const isActive = !child.wip && location.pathname.startsWith(child.to)
              return (
                <NavLink
                  key={child.to + child.label}
                  to={child.to}
                  className="flex items-start gap-3 px-4 py-3 border-b last:border-0 transition-colors"
                  style={{
                    background: isActive ? "color-mix(in srgb, var(--accent) 10%, transparent)" : "transparent",
                    color: child.wip ? "var(--muted-text)" : isActive ? "var(--accent)" : "var(--text)",
                    borderColor: "var(--border)",
                    opacity: child.wip ? 0.65 : 1,
                  }}
                >
                  {Icon && <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium leading-tight">{child.label}</p>
                      {child.wip && (
                        <span
                          className="text-xs px-1 py-0.5 rounded"
                          style={{
                            fontSize: "9px",
                            fontWeight: 600,
                            letterSpacing: "0.05em",
                            background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                            color: "var(--accent)",
                            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                          }}
                        >
                          WIP
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ opacity: 0.55 }}>{child.sub}</p>
                  </div>
                </NavLink>
              )
            })}
          </div>
        )
      })()}
    </>
  )
}
