import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { queryClient } from "@/lib/queryClient"
import { applyTheme } from "@/hooks/useTheme"
import { useToast } from "@/components/ui/toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { Settings } from "@/types"

const FONTS = ["Inter", "Outfit", "Poppins", "Roboto", "JetBrains Mono"]

const DEFAULT_THEME = {
  theme_mode: "Scuro" as const,
  theme_accent: "#6C63FF",
  theme_font: "Inter",
}

export default function Personalizzazione() {
  const toast = useToast()

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
  })

  const [local, setLocal] = useState<{
    theme_mode: "Scuro" | "Chiaro"
    theme_accent: string
    theme_font: string
  }>(() => ({
    theme_mode: settings?.theme_mode ?? DEFAULT_THEME.theme_mode,
    theme_accent: settings?.theme_accent ?? DEFAULT_THEME.theme_accent,
    theme_font: settings?.theme_font ?? DEFAULT_THEME.theme_font,
  }))

  useEffect(() => {
    if (settings) {
      setLocal({
        theme_mode: settings.theme_mode,
        theme_accent: settings.theme_accent,
        theme_font: settings.theme_font,
      })
    }
  }, [settings])

  // Live preview: applica subito le modifiche locali
  useEffect(() => {
    applyTheme(local)
  }, [local])

  const mutation = useMutation({
    mutationFn: (updated: Settings) => api.settings.update(updated),
    onSuccess: (data) => {
      queryClient.setQueryData(["settings"], data)
      applyTheme(data)
      toast("Theme applied", "success")
    },
    onError: () => toast("Errore", "error"),
  })

  const handleApplica = () => {
    if (!settings) return
    mutation.mutate({ ...settings, ...local })
  }

  const handleReset = () => {
    setLocal(DEFAULT_THEME)
    if (settings) {
      const reset = { ...settings, ...DEFAULT_THEME }
      mutation.mutate(reset)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>
        Appearance
      </h2>

      <Card>
        <CardHeader>
          <CardTitle>Interface Theme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Font */}
          <div className="space-y-1.5">
            <Label>Font</Label>
            <Select
              value={local.theme_font}
              onValueChange={v => setLocal(prev => ({ ...prev, theme_font: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map(f => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Colore accent */}
          <div className="space-y-1.5">
            <Label>Accent color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={local.theme_accent}
                onChange={e => setLocal(prev => ({ ...prev, theme_accent: e.target.value }))}
                className="h-9 w-16 rounded cursor-pointer border"
                style={{ borderColor: "var(--border)", background: "transparent" }}
              />
              <span className="text-sm font-mono" style={{ color: "var(--muted-text)" }}>
                {local.theme_accent}
              </span>
            </div>
          </div>

          {/* Dark/Light */}
          <div className="flex items-center justify-between">
            <Label>Dark mode</Label>
            <Switch
              checked={local.theme_mode === "Scuro"}
              onCheckedChange={checked =>
                setLocal(prev => ({ ...prev, theme_mode: checked ? "Scuro" : "Chiaro" }))
              }
            />
          </div>

          {/* Anteprima */}
          <div
            className="rounded-lg p-4 border"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
          >
            <p className="text-sm font-medium mb-1" style={{ color: "var(--accent)" }}>
              Live preview
            </p>
            <p className="text-sm" style={{ color: "var(--text)" }}>
              This is how text will appear in the app.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleApplica} disabled={mutation.isPending} className="flex-1">
              {mutation.isPending ? "Applying..." : "Apply"}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={mutation.isPending}>
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
