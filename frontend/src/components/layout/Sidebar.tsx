import { useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Printer,
  Package,
  Layers,
  Settings,
  BarChart3,
  Palette,
  ChevronDown,
  Receipt,
  RefreshCcw,
  BarChart2,
  Wind,
  Hammer,
  Archive,
  SlidersHorizontal,
  Users,
  Truck,
  Building2,
  Calendar,
  History,
  Box,
  CreditCard,
  ClipboardList,
  Cpu,
  FileText,
  ShoppingBag,
  Lock,
} from "lucide-react"

type SubItem = {
  to: string
  label: string
  sub: string
  icon?: React.ComponentType<{ className?: string }>
  wip?: boolean
}

type LinkItem = {
  parent?: false
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

type ParentItem = {
  parent: true
  label: string
  icon: React.ComponentType<{ className?: string }>
  children: SubItem[]
}

type NavItem = LinkItem | ParentItem

const NAV: NavItem[] = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  {
    parent: true,
    label: "Produzione",
    icon: Layers,
    children: [
      { to: "/produzione/ordini", label: "Ordini", sub: "Gestione ordini e progetti", icon: ClipboardList },
      { to: "/produzione/job", label: "Job", sub: "Gestione job di stampa", icon: Cpu, wip: true },
      { to: "/produzione/spedizioni", label: "Spedizioni", sub: "Tracking e gestione spedizioni", icon: Truck, wip: true },
      { to: "/produzione/pianificazione", label: "Pianificazione", sub: "Calendario produzione", icon: Calendar },
      { to: "/produzione/storico", label: "Storico", sub: "Log stampe completate", icon: History },
    ],
  },
  {
    parent: true,
    label: "Stampanti",
    icon: Printer,
    children: [
      { to: "/stampanti/elenco", label: "Elenco stampanti", sub: "Anagrafica e stato della farm", icon: Printer },
      { to: "/stampanti/manutenzioni", label: "Manutenzioni", sub: "Stato manutenzioni ordinarie", icon: Hammer },
    ],
  },
  {
    parent: true,
    label: "Magazzino",
    icon: Package,
    children: [
      { to: "/magazzino/filamenti", label: "Filamenti", sub: "Bobine e consumo", icon: Wind },
      { to: "/magazzino/componenti", label: "Componenti", sub: "Parti e componenti generici", icon: Archive },
      { to: "/magazzino/ricambi", label: "Ricambi", sub: "Parti di ricambio e compatibilità", icon: SlidersHorizontal },
      { to: "/magazzino/consumabili", label: "Consumabili", sub: "Materiali di consumo", icon: Box, wip: true },
      { to: "/magazzino/imballaggi", label: "Imballaggi", sub: "Materiali di packaging", icon: Box, wip: true },
      { to: "/magazzino/movimenti", label: "Movimenti", sub: "Giacenze e movimentazioni", icon: RefreshCcw, wip: true },
    ],
  },
  {
    parent: true,
    label: "Costi e Report",
    icon: BarChart3,
    children: [
      { to: "/costi/fissi", label: "Costi fissi", sub: "Overhead ricorrenti", icon: RefreshCcw },
      { to: "/costi/spese-straordinarie", label: "Spese straordinarie", sub: "Costi una tantum", icon: Receipt },
      { to: "/costi/pricing", label: "Pricing", sub: "Analisi redditività", icon: BarChart2 },
      { to: "/prossimamente/report", label: "Report", sub: "Statistiche e analisi", icon: BarChart3, wip: true },
    ],
  },
  {
    parent: true,
    label: "Amministrazione",
    icon: Building2,
    children: [
      { to: "/amministrazione/azienda", label: "Azienda", sub: "Dati e informazioni aziendali", icon: Building2 },
      { to: "/amministrazione/preventivi", label: "Preventivi", sub: "Offerte e preventivi clienti", icon: FileText, wip: true },
      { to: "/amministrazione/clienti", label: "Clienti", sub: "Anagrafica clienti", icon: Users },
      { to: "/amministrazione/fornitori", label: "Fornitori", sub: "Anagrafica fornitori e acquisti", icon: ShoppingBag },
      { to: "/prossimamente/fatture", label: "Fatture", sub: "Emissione e gestione fatture", icon: FileText, wip: true },
      { to: "/prossimamente/pagamenti", label: "Pagamenti", sub: "Incassi e pagamenti", icon: CreditCard, wip: true },
    ],
  },
  { to: "/impostazioni", icon: Settings, label: "Impostazioni" },
]

function hasActiveChild(item: ParentItem, pathname: string): boolean {
  return item.children.some(c => !c.wip && pathname.startsWith(c.to))
}

function ParentNavItem({ item }: { item: ParentItem }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isChildActive = hasActiveChild(item, location.pathname)
  const [open, setOpen] = useState(isChildActive)

  const toggle = () => {
    if (!open) {
      const first = item.children.find(c => !c.wip)
      if (first) navigate(first.to)
    }
    setOpen(prev => !prev)
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-fast",
          "hover:bg-[var(--muted-bg)]",
          isChildActive
            ? "text-[var(--accent)]"
            : "text-[var(--muted-text)] hover:text-[var(--text)]",
        )}
        style={isChildActive ? { background: "var(--accent-subtle)" } : undefined}
      >
        <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", isChildActive ? "text-[var(--accent)]" : "text-[var(--muted-text)] group-hover:text-[var(--text)]")} />
        <span className="flex-1 text-left">{item.label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="opacity-50"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="ml-3 mt-0.5 mb-1 border-l pl-3" style={{ borderColor: "var(--border-strong)" }}>
              {item.children.map(child => {
                const Icon = child.icon
                const isActive = !child.wip && location.pathname.startsWith(child.to)
                return (
                  <NavLink
                    key={child.to + child.label}
                    to={child.to}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-all duration-fast my-0.5",
                      child.wip
                        ? "pointer-events-none opacity-40"
                        : isActive
                          ? "font-medium"
                          : "text-[var(--muted-text)] hover:text-[var(--text)] hover:bg-[var(--muted-bg)]",
                    )}
                    style={isActive ? { color: "var(--accent)", background: "var(--accent-subtle)" } : undefined}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                    <span className="flex-1 truncate">{child.label}</span>
                    {child.wip && (
                      <Lock className="h-2.5 w-2.5 opacity-50" />
                    )}
                  </NavLink>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Sidebar() {
  const navigate = useNavigate()
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings.get })
  const companyName = settings?.company_name || "—"
  const initial = companyName !== "—" ? companyName[0].toUpperCase() : "P"

  return (
    <aside
      className="hidden md:flex flex-col w-[var(--sidebar-width)] min-h-screen border-r shrink-0"
      style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)" }}
    >
      {/* Logo / Company */}
      <button
        onClick={() => navigate("/amministrazione/azienda")}
        className="flex items-center gap-3 px-4 py-5 border-b w-full text-left hover:opacity-80 transition-opacity"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold text-sm shrink-0"
          style={{ background: "var(--accent)" }}
        >
          {initial}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight truncate" style={{ color: "var(--text)" }}>PrintFarm</p>
          <p className="text-xs truncate" style={{ color: "var(--muted-text)" }}>{companyName}</p>
        </div>
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV.map(item => {
          if (item.parent) {
            return <ParentNavItem key={item.label} item={item} />
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-fast",
                  isActive
                    ? "text-[var(--accent)]"
                    : "text-[var(--muted-text)] hover:text-[var(--text)] hover:bg-[var(--muted-bg)]",
                )
              }
              style={({ isActive }) =>
                isActive ? { background: "var(--accent-subtle)" } : undefined
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-[var(--accent)]" : "text-[var(--muted-text)] group-hover:text-[var(--text)]")} />
                  {item.label}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t" style={{ borderColor: "var(--border)" }}>
        <NavLink
          to="/impostazioni#aspetto"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all duration-fast",
              isActive
                ? "text-[var(--accent)]"
                : "text-[var(--muted-text)] hover:text-[var(--text)] hover:bg-[var(--muted-bg)]",
            )
          }
        >
          <Palette className="h-3.5 w-3.5" />
          <span>Aspetto</span>
        </NavLink>
      </div>
    </aside>
  )
}
