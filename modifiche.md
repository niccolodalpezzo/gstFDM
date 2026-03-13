# PROMPT: SVILUPPO GESTIONALE PRINTFARM "ARENA PLAST" - VERSIONE 2.0

## RUOLO
Agisci come uno sviluppatore Senior Python esperto in ERP e automazione industriale 4.0.

## 1. SETUP E DESIGN (Basato su @regoled.md)
- Sviluppa in **Python** con **Streamlit**.
- Crea automaticamente le cartelle: `/data`, `/configs`, `/exports`, `/gcode_vault`.
- **Design**: Applica un design accattivante e professionale seguendo le linee guida di `@regoled.md`. Usa una palette colori coerente (es. Dark Mode con accenti aziendali), icone per le sezioni e una spaziatura pulita (clean UI).

## 2. DASHBOARD (Recap Generale)
- Implementa una sezione di riepilogo finanziario immediato:
    - **"Entrate"**: Somma dei budget dei progetti terminati o acconti ricevuti.
    - **"Uscite"**: Somma totale di materiali, energia, ammortamenti, costi fissi e manodopera.
    - **"Margine"**: Differenza netta con indicatore visivo di performance.

## 3. MODULO BOBINE (Gestione Inventario)
- **Campi**: Marca, Materiale, Colore, Costo/kg.
- **Stati Bobina**: Selezione tra "Nuova", "Usata (grammi residui)", "Terminata".
- **Gestione Quantità**: Quando una bobina è in stato "Nuova", deve esserci una casella per indicare quante bobine identiche di quel tipo sono in stock.
- **Codice Univoco**: Genera un codice univoco di **4 caratteri** (es. A1Z2) quando una stampa richiede l'inizio di una bobina "Nuova". All'attivazione, il sistema deve scalare la quantità dallo stock e creare un'istanza "Usata" con quel codice.
- **Manutenzione**: Possibilità di eliminare definitivamente le bobine (specialmente quelle "Terminate").

## 4. MODULO STAMPANTI
- **Configurazione**: Marca, Modello, Diametro Ugello, Consumo (W), Costo Acquisto, Ammortamento Orario.
- **Gestione**: Possibilità di **Modificare** ogni singolo parametro o **Eliminare** la stampante dalla flotta.

## 5. LOG STAMPE & PARSER G-CODE
- **Riparazione Parser**: Implementa la lettura G-code ottimizzata per file generati da **Bambu Studio** (usa il file `@3.gcode` come riferimento per i metadati di tempo e peso).
- **Input Operativo**:
    - Scelta della bobina tramite **Codice Univoco**.
    - Inserimento del tempo nel formato **"Ore.Minuti"** (es. 2.30 per 2 ore e mezza).
- **Scarico Magazzino**: Detrazione automatica dei grammi dalla bobina associata tramite codice univoco.

## 6. GESTIONE PROGETTI
- **Impostazioni Commessa**: 
    - Selettore "Quantità da produrre".
    - Modifica/Eliminazione di progetti esistenti.
- **Stati Progetto**: Menu a tendina con: `Progettazione`, `Prototipazione`, `Produzione`, `Terminato`.
- **Calcolo Costi**: Includere ore di progettazione e costi extra (packaging, componenti).

## 7. COSTI FISSI
- Gestione dinamica (ON/OFF) di affitto, luce e software, con ripartizione oraria sui progetti come discusso precedentemente.

