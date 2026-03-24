import type { LucideIcon } from "lucide-react"
import {
  Archive,
  BarChart3,
  Box,
  Building2,
  Calendar,
  ClipboardList,
  Cpu,
  FileText,
  Hammer,
  History,
  LayoutDashboard,
  Layers,
  Package,
  Palette,
  Printer,
  Receipt,
  RefreshCcw,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Truck,
  Users,
  Wind,
} from "lucide-react"

export type NavigationSubItem = {
  id: string
  label: string
  to: string
  icon: LucideIcon
  badge?: string
  wip?: boolean
}

export type NavigationItem = {
  id: string
  label: string
  description: string
  to: string
  icon: LucideIcon
  badge?: string
  wip?: boolean
  children?: NavigationSubItem[]
}

export type NavigationSection = {
  id: string
  label: string
  caption: string
  description: string
  defaultTo: string
  icon: LucideIcon
  matchers: string[]
  items: NavigationItem[]
}

export const NAVIGATION: NavigationSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    caption: "Control Center",
    description: "Panoramica operativa, KPI e scorciatoie verso i flussi principali.",
    defaultTo: "/",
    icon: LayoutDashboard,
    matchers: ["/"],
    items: [
      {
        id: "dashboard-overview",
        label: "Panoramica generale",
        description: "Alert, analytics e stato attuale della print farm.",
        to: "/",
        icon: LayoutDashboard,
        children: [
          { id: "dashboard-orders", label: "Ordini", to: "/produzione/ordini", icon: ClipboardList, badge: "Ops" },
          { id: "dashboard-printers", label: "Stampanti", to: "/stampanti/elenco", icon: Printer, badge: "Live" },
          { id: "dashboard-costs", label: "Costi", to: "/costi/spese-straordinarie", icon: BarChart3 },
        ],
      },
    ],
  },
  {
    id: "produzione",
    label: "Produzione",
    caption: "Execution Layer",
    description: "Ordini, storico stampa e pianificazione del workflow produttivo.",
    defaultTo: "/produzione/ordini",
    icon: Layers,
    matchers: ["/produzione", "/print-log", "/progetti"],
    items: [
      {
        id: "production-orders",
        label: "Ordini e progetti",
        description: "Pipeline ordini, budget e avanzamento commesse.",
        to: "/produzione/ordini",
        icon: ClipboardList,
        children: [
          { id: "production-log", label: "Print Log", to: "/produzione/storico", icon: History },
          { id: "production-plan", label: "Pianificazione", to: "/produzione/pianificazione", icon: Calendar },
          { id: "production-job", label: "Job", to: "/produzione/job", icon: Cpu, wip: true, badge: "Soon" },
          { id: "production-shipping", label: "Spedizioni", to: "/produzione/spedizioni", icon: Truck, wip: true, badge: "Soon" },
        ],
      },
    ],
  },
  {
    id: "stampanti",
    label: "Stampanti",
    caption: "Machine Fleet",
    description: "Parco macchine, stato live e manutenzione della farm.",
    defaultTo: "/stampanti/elenco",
    icon: Printer,
    matchers: ["/stampanti"],
    items: [
      {
        id: "printers-fleet",
        label: "Flotta stampanti",
        description: "Asset, componenti attivi e configurazione operativa.",
        to: "/stampanti/elenco",
        icon: Printer,
        children: [
          { id: "printers-maintenance", label: "Manutenzioni", to: "/stampanti/manutenzioni", icon: Hammer, badge: "Care" },
        ],
      },
    ],
  },
  {
    id: "magazzino",
    label: "Magazzino",
    caption: "Stock Control",
    description: "Materiali, scorte e asset di magazzino con focus operativo.",
    defaultTo: "/magazzino/filamenti",
    icon: Package,
    matchers: ["/magazzino", "/inventory"],
    items: [
      {
        id: "inventory-materials",
        label: "Materiali e asset",
        description: "Filamenti, ricambi e componenti tecnici disponibili.",
        to: "/magazzino/filamenti",
        icon: Wind,
        children: [
          { id: "inventory-filaments", label: "Filamenti", to: "/magazzino/filamenti", icon: Wind, badge: "Core" },
          { id: "inventory-spares", label: "Ricambi", to: "/magazzino/ricambi", icon: SlidersHorizontal },
          { id: "inventory-components", label: "Componenti", to: "/magazzino/componenti", icon: Archive },
          { id: "inventory-consumables", label: "Consumabili", to: "/magazzino/consumabili", icon: Box, wip: true, badge: "Soon" },
          { id: "inventory-movements", label: "Movimenti", to: "/magazzino/movimenti", icon: RefreshCcw, wip: true, badge: "Soon" },
        ],
      },
    ],
  },
  {
    id: "costi",
    label: "Costi e Report",
    caption: "Cost Intelligence",
    description: "Spese, overhead e pricing per leggere margini e sostenibilità.",
    defaultTo: "/costi/spese-straordinarie",
    icon: BarChart3,
    matchers: ["/costi", "/spese-correnti", "/spese", "/financial"],
    items: [
      {
        id: "costs-control",
        label: "Controllo costi",
        description: "Spese straordinarie, fisse e dati per il pricing.",
        to: "/costi/spese-straordinarie",
        icon: Receipt,
        children: [
          { id: "costs-extra", label: "Spese straordinarie", to: "/costi/spese-straordinarie", icon: Receipt, badge: "Live" },
          { id: "costs-fixed", label: "Costi fissi", to: "/costi/fissi", icon: RefreshCcw },
          { id: "costs-recurring", label: "Spese correnti", to: "/spese-correnti", icon: FileText },
          { id: "costs-pricing", label: "Pricing", to: "/costi/pricing", icon: BarChart3 },
        ],
      },
    ],
  },
  {
    id: "amministrazione",
    label: "Amministrazione",
    caption: "Business Records",
    description: "Clienti, fornitori e dati societari con impostazione gestionale.",
    defaultTo: "/amministrazione/clienti",
    icon: Building2,
    matchers: ["/amministrazione", "/clienti", "/fornitori"],
    items: [
      {
        id: "admin-entities",
        label: "Anagrafiche e societa",
        description: "Rubrica clienti, fornitori e profilo aziendale.",
        to: "/amministrazione/clienti",
        icon: Users,
        children: [
          { id: "admin-customers", label: "Clienti", to: "/amministrazione/clienti", icon: Users, badge: "CRM" },
          { id: "admin-suppliers", label: "Fornitori", to: "/amministrazione/fornitori", icon: ShoppingBag },
          { id: "admin-company", label: "Azienda", to: "/amministrazione/azienda", icon: Building2 },
          { id: "admin-quotes", label: "Preventivi", to: "/amministrazione/preventivi", icon: FileText, badge: "Live" },
        ],
      },
    ],
  },
  {
    id: "impostazioni",
    label: "Impostazioni",
    caption: "System Config",
    description: "Parametri farm, manutenzioni globali e configurazione filamenti.",
    defaultTo: "/impostazioni",
    icon: Settings,
    matchers: ["/impostazioni", "/personalizzazione"],
    items: [
      {
        id: "settings-core",
        label: "Configurazione globale",
        description: "Parametri operativi, manutenzioni e tabelle di supporto.",
        to: "/impostazioni",
        icon: Palette,
        children: [
          { id: "settings-general", label: "Generali", to: "/impostazioni#generali", icon: Settings, badge: "Base" },
          { id: "settings-maintenance", label: "Manutenzioni", to: "/impostazioni#manutenzioni-ordinarie", icon: Hammer },
          { id: "settings-filaments", label: "Filamenti", to: "/impostazioni#filamenti", icon: Wind },
        ],
      },
    ],
  },
]

function pathMatches(pathname: string, matcher: string) {
  if (matcher === "/") return pathname === "/"
  return pathname === matcher || pathname.startsWith(`${matcher}/`)
}

export function getSectionById(sectionId: string | null) {
  return NAVIGATION.find(section => section.id === sectionId) ?? null
}

export function getSectionByPath(pathname: string) {
  return NAVIGATION.find(section => section.matchers.some(matcher => pathMatches(pathname, matcher))) ?? NAVIGATION[0]
}

export function splitNavigationTarget(target: string) {
  const [path, hash] = target.split("#")
  return {
    path: path || "/",
    hash: hash ? `#${hash}` : "",
  }
}

export function isTargetActive(target: string, pathname: string, hash: string) {
  const parsed = splitNavigationTarget(target)

  if (parsed.hash) {
    return pathname === parsed.path && hash === parsed.hash
  }

  if (parsed.path === "/") {
    return pathname === "/"
  }

  return pathname === parsed.path || pathname.startsWith(`${parsed.path}/`)
}
