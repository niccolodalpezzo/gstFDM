import type { ReactNode } from "react"
import { Sidebar } from "@/components/layout/Sidebar"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar />

      <main className="app-shell__main">
        <div className="app-shell__frame">
          <div className="app-shell__scroll">
            <div className="app-shell__content">{children}</div>
          </div>
        </div>
      </main>
    </div>
  )
}
