import { lazy, Suspense, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClientProvider, useQuery } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { api } from "@/lib/api"
import { applyTheme } from "@/hooks/useTheme"
import { Sidebar } from "@/components/layout/Sidebar"
import { ToastProvider } from "@/components/ui/toast"

// Lazy-load pages
const Dashboard = lazy(() => import("@/pages/Dashboard"))
const PrintLog = lazy(() => import("@/pages/PrintLog"))
const Progetti = lazy(() => import("@/pages/Progetti"))
const Inventory = lazy(() => import("@/pages/Inventory"))
const Stampanti = lazy(() => import("@/pages/Stampanti"))
const SpeseCorrenti = lazy(() => import("@/pages/SpeseCorrenti"))
const FinancialManagement = lazy(() => import("@/pages/FinancialManagement"))
const Impostazioni = lazy(() => import("@/pages/Impostazioni"))
const Personalizzazione = lazy(() => import("@/pages/Personalizzazione"))
const Clienti = lazy(() => import("@/pages/Clienti"))
const Fornitori = lazy(() => import("@/pages/Fornitori"))

// ─── Placeholder per funzionalità in sviluppo ─────────────────────────────────
function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-60">
      <div className="text-5xl">🚧</div>
      <p className="text-lg font-semibold" style={{ color: "var(--text)" }}>Funzionalità in sviluppo</p>
      <p className="text-sm" style={{ color: "var(--muted-text)" }}>Questa sezione sarà disponibile nelle prossime versioni.</p>
    </div>
  )
}

function ThemeInitializer() {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
  })

  useEffect(() => {
    if (settings) {
      applyTheme(settings)
    }
  }, [settings])

  return null
}

function AppLayout() {
  return (
    <BrowserRouter>
      <ThemeInitializer />
      <Sidebar />
      <main className="flex-1 overflow-auto p-6" style={{ minHeight: "100vh" }}>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64 opacity-50">
              Loading...
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/print-log" element={<PrintLog />} />
            <Route path="/progetti" element={<Progetti />} />
            <Route path="/magazzino" element={<Navigate to="/inventory/filament" replace />} />
            <Route path="/inventory" element={<Navigate to="/inventory/filament" replace />} />
            <Route path="/inventory/filament"   element={<Inventory />} />
            <Route path="/inventory/components" element={<Inventory />} />
            <Route path="/inventory/assets"     element={<Inventory />} />
            <Route path="/stampanti" element={<Stampanti />} />
            <Route path="/spese" element={<SpeseCorrenti />} />
            <Route path="/financial" element={<Navigate to="/financial/expenses" replace />} />
            <Route path="/financial/expenses"  element={<FinancialManagement />} />
            <Route path="/financial/recurring" element={<FinancialManagement />} />
            <Route path="/financial/projects"  element={<FinancialManagement />} />
            <Route path="/impostazioni" element={<Navigate to="/impostazioni/costs" replace />} />
            <Route path="/impostazioni/costs"       element={<Impostazioni />} />
            <Route path="/impostazioni/tare-config" element={<Impostazioni />} />
            <Route path="/impostazioni/appearance"  element={<Personalizzazione />} />
            <Route path="/personalizzazione" element={<Navigate to="/impostazioni/appearance" replace />} />
            <Route path="/clienti" element={<Clienti />} />
            <Route path="/fornitori" element={<Fornitori />} />
            {/* Sezioni in sviluppo */}
            <Route path="/prossimamente/*" element={<ComingSoon />} />
          </Routes>
        </Suspense>
      </main>
    </BrowserRouter>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppLayout />
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App
