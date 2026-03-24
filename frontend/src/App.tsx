import { lazy, Suspense, useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { QueryClientProvider, useQuery } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { queryClient } from "@/lib/queryClient"
import { api } from "@/lib/api"
import { applyTheme } from "@/hooks/useTheme"
import { AppShell } from "@/components/layout/AppShell"
import { ToastProvider } from "@/components/ui/toast"
import "./App.css"

// Lazy-load pages
const Dashboard        = lazy(() => import("@/pages/Dashboard"))
const PrintLog         = lazy(() => import("@/pages/PrintLog"))
const Progetti         = lazy(() => import("@/pages/Progetti"))
const Inventory        = lazy(() => import("@/pages/Inventory"))
const Stampanti        = lazy(() => import("@/pages/Stampanti"))
const SpeseCorrenti    = lazy(() => import("@/pages/SpeseCorrenti"))
const FinancialManagement = lazy(() => import("@/pages/FinancialManagement"))
const Impostazioni     = lazy(() => import("@/pages/Impostazioni"))
const Clienti          = lazy(() => import("@/pages/Clienti"))
const Fornitori        = lazy(() => import("@/pages/Fornitori"))
const Pianificazione   = lazy(() => import("@/pages/Pianificazione"))
const Manutenzioni     = lazy(() => import("@/pages/Manutenzioni"))
const Azienda          = lazy(() => import("@/pages/Azienda"))
const Preventivi       = lazy(() => import("@/pages/Preventivi"))

// ─── Page skeleton loader ─────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-48 rounded-lg skeleton" />
      <div className="h-4 w-72 rounded skeleton" />
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl skeleton" />
        ))}
      </div>
      <div className="h-64 rounded-xl skeleton" />
    </div>
  )
}

// ─── Coming Soon ──────────────────────────────────────────────────────────────
function ComingSoon() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center h-64 gap-4"
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
        style={{ background: "var(--accent-subtle)" }}
      >
        🚧
      </div>
      <div className="text-center">
        <p className="font-semibold text-base" style={{ color: "var(--text)" }}>
          Funzionalità in sviluppo
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--muted-text)" }}>
          Questa sezione sarà disponibile nelle prossime versioni.
        </p>
      </div>
    </motion.div>
  )
}

// ─── Theme initializer ────────────────────────────────────────────────────────
function ThemeInitializer() {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
  })
  useEffect(() => {
    if (settings) applyTheme(settings)
  }, [settings])
  return null
}

// ─── Animated page wrapper ────────────────────────────────────────────────────
const pageVariants = {
  initial:  { opacity: 0, y: 8 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -4 },
}
const pageTransition = { duration: 0.22, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        className="h-full"
      >
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/commerciale" element={<Navigate to="/produzione/ordini" replace />} />
            <Route path="/produzione" element={<Navigate to="/produzione/ordini" replace />} />
            <Route path="/produzione/ordini" element={<Progetti />} />
            <Route path="/produzione/job" element={<ComingSoon />} />
            <Route path="/produzione/spedizioni" element={<ComingSoon />} />
            <Route path="/print-log" element={<PrintLog />} />
            <Route path="/produzione/storico" element={<PrintLog />} />
            <Route path="/produzione/pianificazione" element={<Pianificazione />} />
            <Route path="/progetti" element={<Navigate to="/produzione/ordini" replace />} />
            <Route path="/magazzino" element={<Navigate to="/magazzino/filamenti" replace />} />
            <Route path="/magazzino/filamenti" element={<Inventory />} />
            <Route path="/magazzino/ricambi" element={<Inventory />} />
            <Route path="/magazzino/componenti" element={<Inventory />} />
            <Route path="/magazzino/consumabili" element={<ComingSoon />} />
            <Route path="/magazzino/imballaggi" element={<ComingSoon />} />
            <Route path="/magazzino/movimenti" element={<ComingSoon />} />
            <Route path="/inventory" element={<Navigate to="/magazzino/filamenti" replace />} />
            <Route path="/inventory/filament" element={<Navigate to="/magazzino/filamenti" replace />} />
            <Route path="/inventory/components" element={<Navigate to="/magazzino/ricambi" replace />} />
            <Route path="/inventory/assets" element={<Navigate to="/magazzino/componenti" replace />} />
            <Route path="/stampanti" element={<Navigate to="/stampanti/elenco" replace />} />
            <Route path="/stampanti/elenco" element={<Stampanti />} />
            <Route path="/stampanti/manutenzioni" element={<Manutenzioni />} />
            <Route path="/amministrazione" element={<Navigate to="/amministrazione/clienti" replace />} />
            <Route path="/amministrazione/preventivi" element={<Preventivi />} />
            <Route path="/amministrazione/clienti" element={<Clienti />} />
            <Route path="/amministrazione/fornitori" element={<Fornitori />} />
            <Route path="/amministrazione/azienda" element={<Azienda />} />
            <Route path="/spese" element={<Navigate to="/costi/spese-straordinarie" replace />} />
            <Route path="/spese-correnti" element={<SpeseCorrenti />} />
            <Route path="/costi" element={<Navigate to="/costi/spese-straordinarie" replace />} />
            <Route path="/costi/spese-straordinarie" element={<FinancialManagement />} />
            <Route path="/costi/fissi" element={<FinancialManagement />} />
            <Route path="/costi/pricing" element={<FinancialManagement />} />
            <Route path="/financial" element={<Navigate to="/costi/spese-straordinarie" replace />} />
            <Route path="/financial/expenses" element={<Navigate to="/costi/spese-straordinarie" replace />} />
            <Route path="/financial/recurring" element={<Navigate to="/costi/fissi" replace />} />
            <Route path="/financial/projects" element={<Navigate to="/costi/pricing" replace />} />
            <Route path="/impostazioni" element={<Impostazioni />} />
            <Route path="/impostazioni/parametri-farm" element={<Navigate to="/impostazioni#generali" replace />} />
            <Route path="/impostazioni/config-filamenti" element={<Navigate to="/impostazioni#filamenti" replace />} />
            <Route path="/impostazioni/aspetto" element={<Navigate to="/impostazioni#aspetto" replace />} />
            <Route path="/impostazioni/costs" element={<Navigate to="/impostazioni" replace />} />
            <Route path="/impostazioni/tare-config" element={<Navigate to="/impostazioni" replace />} />
            <Route path="/impostazioni/appearance" element={<Navigate to="/impostazioni" replace />} />
            <Route path="/personalizzazione" element={<Navigate to="/impostazioni" replace />} />
            <Route path="/clienti" element={<Navigate to="/amministrazione/clienti" replace />} />
            <Route path="/fornitori" element={<Navigate to="/amministrazione/fornitori" replace />} />
            <Route path="/prossimamente/*" element={<ComingSoon />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── App layout ───────────────────────────────────────────────────────────────
function AppLayout() {
  return (
    <BrowserRouter>
      <ThemeInitializer />
      <AppShell>
        <AnimatedRoutes />
      </AppShell>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppLayout />
      </ToastProvider>
    </QueryClientProvider>
  )
}
