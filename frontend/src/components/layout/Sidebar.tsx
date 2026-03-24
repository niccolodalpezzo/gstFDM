import { useEffect, useMemo, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ContextSidebar } from "@/components/layout/ContextSidebar"
import { PrimaryRail } from "@/components/layout/PrimaryRail"
import { NAVIGATION, getSectionById, getSectionByPath, type NavigationSection } from "@/components/layout/navigation"

const STORAGE_ACTIVE_SECTION = "gst-shell.active-section"
const STORAGE_PANEL_COLLAPSED = "gst-shell.panel-collapsed"

function readStoredValue(key: string) {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(key)
}

function writeStoredValue(key: string, value: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, value)
}

function resolveInitialSection(pathname: string) {
  const routeSection = getSectionByPath(pathname)
  const storedSection = readStoredValue(STORAGE_ACTIVE_SECTION)

  if (storedSection) {
    const match = getSectionById(storedSection)
    if (match) return match
  }

  return routeSection
}

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: api.settings.get })

  const routeSection = useMemo(() => getSectionByPath(location.pathname), [location.pathname])
  const [activeSectionId, setActiveSectionId] = useState<string | null>(() => resolveInitialSection(location.pathname).id)
  const [panelCollapsed, setPanelCollapsed] = useState(() => readStoredValue(STORAGE_PANEL_COLLAPSED) === "true")

  const activeSection = getSectionById(activeSectionId) ?? routeSection
  const companyName = settings?.company_name?.trim() || "PrintFarm"
  const companyInitial = companyName.charAt(0).toUpperCase() || "P"

  useEffect(() => {
    if (routeSection.id !== activeSectionId) {
      setActiveSectionId(routeSection.id)
    }

    if (routeSection.items.length > 0) {
      setPanelCollapsed(false)
    }
  }, [routeSection.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeSectionId) {
      writeStoredValue(STORAGE_ACTIVE_SECTION, activeSectionId)
    }
  }, [activeSectionId])

  useEffect(() => {
    writeStoredValue(STORAGE_PANEL_COLLAPSED, String(panelCollapsed))
  }, [panelCollapsed])

  function navigateToSection(section: NavigationSection) {
    const isInsideSection = section.matchers.some(matcher => {
      if (matcher === "/") return location.pathname === "/"
      return location.pathname === matcher || location.pathname.startsWith(`${matcher}/`)
    })

    if (!isInsideSection) {
      navigate(section.defaultTo)
    }
  }

  function handleSectionSelect(section: NavigationSection) {
    setActiveSectionId(section.id)

    if (activeSectionId === section.id) {
      setPanelCollapsed(prev => !prev)
    } else {
      setPanelCollapsed(false)
      navigateToSection(section)
    }
  }

  return (
    <aside className="app-sidebar-shell">
      <PrimaryRail
        companyInitial={companyInitial}
        companyName={companyName}
        sections={NAVIGATION}
        activeSectionId={activeSection.id}
        panelCollapsed={panelCollapsed}
        onSectionSelect={handleSectionSelect}
        onHomeClick={() => navigate("/")}
        onAppearanceClick={() => navigate("/impostazioni")}
        onTogglePanel={() => setPanelCollapsed(prev => !prev)}
      />

      <ContextSidebar
        section={activeSection}
        companyName={companyName}
        isOpen={!panelCollapsed}
        onClose={() => setPanelCollapsed(true)}
      />
    </aside>
  )
}
