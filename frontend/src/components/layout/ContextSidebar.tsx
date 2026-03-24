import { ChevronLeft, Lock } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { NavLink, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import type { NavigationItem, NavigationSection, NavigationSubItem } from "@/components/layout/navigation"
import { isTargetActive } from "@/components/layout/navigation"

interface ContextSidebarProps {
  section: NavigationSection | null
  companyName: string
  isOpen: boolean
  onClose: () => void
  onNavigate?: () => void
  mode?: "desktop" | "mobile"
}

function SidebarBadge({ value }: { value?: string }) {
  if (!value) return null
  return <span className="app-context__badge">{value}</span>
}

function ContextSubItem({
  item,
  isActive,
  onNavigate,
}: {
  item: NavigationSubItem
  isActive: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon

  if (item.wip) {
    return (
      <div className="app-context__subitem is-disabled" aria-disabled="true">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{item.label}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SidebarBadge value={item.badge} />
          <Lock className="h-3 w-3" />
        </div>
      </div>
    )
  }

  return (
    <NavLink
      to={item.to}
      className={cn("app-context__subitem", isActive && "is-active")}
      onClick={onNavigate}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{item.label}</span>
      </div>
      <SidebarBadge value={item.badge} />
    </NavLink>
  )
}

function ContextNavItem({
  item,
  pathname,
  hash,
  onNavigate,
}: {
  item: NavigationItem
  pathname: string
  hash: string
  onNavigate?: () => void
}) {
  const Icon = item.icon
  const isActive = isTargetActive(item.to, pathname, hash)
  const activeChild = item.children?.some(child => isTargetActive(child.to, pathname, hash)) ?? false
  const expanded = Boolean(item.children?.length)

  if (item.wip) {
    return (
      <div className="app-context__item is-disabled" aria-disabled="true">
        <div className="app-context__item-head">
          <div className="app-context__item-icon">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="app-context__item-label">{item.label}</p>
            <p className="app-context__item-description">{item.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <SidebarBadge value={item.badge} />
            <Lock className="h-3 w-3" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("app-context__item-shell", (isActive || activeChild) && "is-active")}>
      <NavLink
        to={item.to}
        className={cn("app-context__item", (isActive || activeChild) && "is-active")}
        onClick={onNavigate}
      >
        <div className="app-context__item-head">
          <div className="app-context__item-icon">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="app-context__item-label">{item.label}</p>
            <p className="app-context__item-description">{item.description}</p>
          </div>
          <SidebarBadge value={item.badge} />
        </div>
      </NavLink>

      {expanded && (
        <div className="app-context__submenu">
          {item.children?.map(child => (
            <ContextSubItem
              key={child.id}
              item={child}
              isActive={isTargetActive(child.to, pathname, hash)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ContextSidebarContent({
  section,
  companyName,
  onClose,
  onNavigate,
}: {
  section: NavigationSection
  companyName: string
  onClose: () => void
  onNavigate?: () => void
}) {
  const location = useLocation()
  const availableItems = section.items.reduce((count, item) => count + 1 + (item.children?.filter(child => !child.wip).length ?? 0), 0)

  return (
    <>
      <div className="app-context__header">
        <div className="min-w-0">
          <p className="app-context__eyebrow">{companyName || "Print Farm"}</p>
          <h2 className="app-context__title">{section.label}</h2>
          <p className="app-context__subtitle">{section.description}</p>
        </div>
        <button
          type="button"
          className="app-context__close"
          onClick={onClose}
          aria-label="Collassa pannello contestuale"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="app-context__body">
        <div className="app-context__section-label">{section.caption}</div>
        <div className="app-context__nav">
          {section.items.map(item => (
            <ContextNavItem
              key={item.id}
              item={item}
              pathname={location.pathname}
              hash={location.hash}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>

      <div className="app-context__footer">
        <span>{availableItems} voci disponibili</span>
        <span className="app-context__footer-pill">{section.caption}</span>
      </div>
    </>
  )
}

export function ContextSidebar({
  section,
  companyName,
  isOpen,
  onClose,
  onNavigate,
  mode = "desktop",
}: ContextSidebarProps) {
  if (!section) return null

  if (mode === "mobile") {
    return (
      <aside className="app-context app-context--mobile">
        <ContextSidebarContent
          section={section}
          companyName={companyName}
          onClose={onClose}
          onNavigate={onNavigate}
        />
      </aside>
    )
  }

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.aside
          key={section.id}
          className="app-context"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "var(--context-width)", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="app-context__inner">
            <ContextSidebarContent
              section={section}
              companyName={companyName}
              onClose={onClose}
              onNavigate={onNavigate}
            />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
