import { ChevronLeft, ChevronRight, Palette } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NavigationSection } from "@/components/layout/navigation"

interface PrimaryRailProps {
  companyInitial: string
  companyName: string
  sections: NavigationSection[]
  activeSectionId: string | null
  panelCollapsed: boolean
  onSectionSelect: (section: NavigationSection) => void
  onHomeClick: () => void
  onAppearanceClick: () => void
  onTogglePanel: () => void
}

export function PrimaryRail({
  companyInitial,
  companyName,
  sections,
  activeSectionId,
  panelCollapsed,
  onSectionSelect,
  onHomeClick,
  onAppearanceClick,
  onTogglePanel,
}: PrimaryRailProps) {
  return (
    <div className="app-rail">
      <button
        type="button"
        className="app-rail__brand"
        title={companyName}
        aria-label="Vai alla dashboard"
        onClick={onHomeClick}
      >
        <span className="app-rail__brand-mark">{companyInitial}</span>
      </button>

      <nav className="app-rail__nav" aria-label="Sezioni principali">
        {sections.map(section => {
          const Icon = section.icon
          const isActive = section.id === activeSectionId

          return (
            <button
              key={section.id}
              type="button"
              title={section.label}
              aria-label={section.label}
              aria-pressed={isActive}
              onClick={() => onSectionSelect(section)}
              className={cn("app-rail__button", isActive && "is-active")}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="sr-only">{section.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="app-rail__footer">
        <button
          type="button"
          className="app-rail__button app-rail__button--utility"
          title={panelCollapsed ? "Espandi pannello" : "Collassa pannello"}
          aria-label={panelCollapsed ? "Espandi pannello contestuale" : "Collassa pannello contestuale"}
          onClick={onTogglePanel}
        >
          {panelCollapsed ? <ChevronRight className="h-[18px] w-[18px]" /> : <ChevronLeft className="h-[18px] w-[18px]" />}
        </button>

        <button
          type="button"
          className="app-rail__button app-rail__button--utility"
          title="Aspetto e tema"
          aria-label="Vai alle impostazioni di aspetto"
          onClick={onAppearanceClick}
        >
          <Palette className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  )
}
