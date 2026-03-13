import { lazy, Suspense, useEffect } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClientProvider, useQuery } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { api } from "@/lib/api"
import { applyTheme } from "@/hooks/useTheme"
import { Sidebar } from "@/components/layout/Sidebar"
import { ToastProvider } from "@/components/ui/toast"
import type { Settings } from "@/types"

// Lazy-load pages
const Dashboard = lazy(() => import("@/pages/Dashboard"))
const PrintLog = lazy(() => import("@/pages/PrintLog"))
const Progetti = lazy(() => import("@/pages/Progetti"))
const Magazzino = lazy(() => import("@/pages/Magazzino"))
const Stampanti = lazy(() => import("@/pages/Stampanti"))
const SpeseCorrenti = lazy(() => import("@/pages/SpeseCorrenti"))
const Impostazioni = lazy(() => import("@/pages/Impostazioni"))
const Personalizzazione = lazy(() => import("@/pages/Personalizzazione"))

function ThemeInitializer() {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
  })

  useEffect(() => {
    if (settings) {
      applyTheme(settings as Settings)
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
              Caricamento...
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/print-log" element={<PrintLog />} />
            <Route path="/progetti" element={<Progetti />} />
            <Route path="/magazzino" element={<Magazzino />} />
            <Route path="/stampanti" element={<Stampanti />} />
            <Route path="/spese" element={<SpeseCorrenti />} />
            <Route path="/impostazioni" element={<Impostazioni />} />
            <Route path="/personalizzazione" element={<Personalizzazione />} />
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
