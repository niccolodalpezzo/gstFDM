import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Printer, Package, Layers, Settings,
  Wrench, DollarSign, Palette
} from "lucide-react"

const links = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/print-log", icon: Printer, label: "Print Log" },
  { to: "/progetti", icon: Layers, label: "Progetti" },
  { to: "/magazzino", icon: Package, label: "Magazzino" },
  { to: "/stampanti", icon: Wrench, label: "Stampanti" },
  { to: "/spese", icon: DollarSign, label: "Spese Correnti" },
  { to: "/impostazioni", icon: Settings, label: "Impostazioni" },
  { to: "/personalizzazione", icon: Palette, label: "Personalizzazione" },
]

export function Sidebar() {
  return (
    <aside
      className="hidden md:flex flex-col w-56 min-h-screen border-r p-4 gap-1 shrink-0"
      style={{ background: "var(--sidebar-bg)", borderColor: "var(--border)" }}
    >
      <div className="px-2 py-4 mb-2">
        <h1 className="text-lg font-bold" style={{ color: "var(--accent)" }}>
          PrintFarm
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--muted-text)" }}>
          Arena Plast
        </p>
      </div>

      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "font-medium"
                : "opacity-70 hover:opacity-100 hover:bg-muted"
            )
          }
          style={({ isActive }) =>
            isActive
              ? { background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }
              : undefined
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </aside>
  )
}
