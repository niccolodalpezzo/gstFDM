/**
 * Traduce gli errori API in messaggi italiani leggibili dall'utente.
 */

const STATUS_MAP: Record<string, string> = {
  "400": "Richiesta non valida. Controlla i dati inseriti.",
  "401": "Sessione non autorizzata. Ricarica la pagina.",
  "403": "Non hai i permessi per eseguire questa operazione.",
  "404": "Elemento non trovato. Potrebbe essere stato eliminato o spostato.",
  "409": "Operazione non consentita nello stato attuale del documento.",
  "413": "Il file e troppo grande. Riduci le dimensioni e riprova.",
  "422": "Dati non validi. Controlla i campi evidenziati.",
  "500": "Errore interno del server. Riprova tra qualche istante.",
  "502": "Il server non e raggiungibile. Verifica la connessione.",
  "503": "Il servizio e temporaneamente non disponibile. Riprova.",
}

const FIELD_MAP: Record<string, string> = {
  stampante_id: "Seleziona una stampante valida prima di procedere.",
  progetto_nome: "Il nome del progetto e obbligatorio.",
  cliente_id: "Seleziona un cliente valido.",
  ore_stampa: "Inserisci un valore valido per le ore di stampa.",
  materiali: "Controlla i dati dei materiali: peso e costo sono obbligatori.",
  costo_kg: "Il costo al kg del materiale e obbligatorio.",
  grammi_modello: "Inserisci il peso del modello in grammi.",
  file: "Seleziona un file valido da caricare.",
  corriere: "Inserisci il nome del corriere.",
  codice_tracking: "Inserisci il codice di tracking.",
}

export function translateApiError(error: unknown): string {
  if (!(error instanceof Error)) return "Si e verificato un errore imprevisto."

  const msg = error.message

  // Try to extract HTTP status and detail
  const statusMatch = msg.match(/^(\d{3}):\s*(.*)$/s)
  if (statusMatch) {
    const status = statusMatch[1]
    const body = statusMatch[2].trim()

    // 422: try to extract field-specific messages
    if (status === "422") {
      try {
        const parsed = JSON.parse(body)
        if (typeof parsed === "string") return parsed
        if (parsed?.detail) {
          if (typeof parsed.detail === "string") return parsed.detail
          if (Array.isArray(parsed.detail)) {
            return parsed.detail
              .map((d: { loc?: string[]; msg?: string }) => {
                const field = d.loc?.[d.loc.length - 1]
                return (field && FIELD_MAP[field]) || d.msg || "Campo non valido"
              })
              .join(". ")
          }
        }
      } catch {
        // Not JSON, use the raw body if it looks like Italian
        if (body && !body.startsWith("{")) return body
      }
    }

    // 409: use the detail message if available
    if (status === "409") {
      try {
        const parsed = JSON.parse(body)
        if (parsed?.detail && typeof parsed.detail === "string") return parsed.detail
      } catch {
        if (body && !body.startsWith("{")) return body
      }
    }

    // 404
    if (status === "404") {
      try {
        const parsed = JSON.parse(body)
        if (parsed?.detail && typeof parsed.detail === "string") return parsed.detail
      } catch { /* ignore */ }
    }

    return STATUS_MAP[status] || `Errore ${status}. Riprova.`
  }

  // Network errors
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
    return "Impossibile contattare il server. Verifica la connessione."
  }

  return "Si e verificato un errore. Controlla i dati e riprova."
}
