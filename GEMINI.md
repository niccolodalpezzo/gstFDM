# PROMPT: SVILUPPO GESTIONALE PRINTFARM FDM "PRO-PROJECT"

## 1. OBIETTIVO E RUOLO
Agisci come un Software Architect esperto in sistemi ERP per l'Industria 4.0. 
Sviluppa un programma in **Python** (Interfaccia **Streamlit**) per gestire una printfarm aziendale. Il software deve organizzare il lavoro per **Progetti/Commesse** e calcolare il **Margine Lordo Reale** includendo costi fissi, variabili e accessori.

## 2. STRUTTURA CARTELLE AUTOMATICA
Al primo avvio, il programma deve verificare e creare le seguenti cartelle nella directory di esecuzione:
- `/data`: Contiene il database SQLite `printfarm.sqlite`.
- `/gcode_vault`: Archivio dei file .gcode caricati.
- `/exports`: Cartella per i report CSV/PDF generati.
- `/configs`: Contiene `settings.json` per i costi predefiniti.

## 3. ARCHITETTURA DATABASE (SQLite)
Il database deve gestire le seguenti relazioni:
- **Tabella Progetti**: ID, Nome Progetto, Cliente, Budget (Prezzo Vendita), Stato.
- **Tabella Stampanti**: ID, Modello, Consumo (W), Costo Acquisto, Ammortamento Orario stimato.
- **Tabella Magazzino**: ID, Materiale (PLA/PETG/etc), Colore, Costo al kg, Grammi Residui.
- **Tabella Costi_Fissi**: ID, Nome (es. Affitto), Importo Mensile, Switch Attivo (Boolean).
- **Tabella Log_Stampe**: ID, Progetto_ID (FK), Stampante_ID (FK), Materiale_ID (FK), Grammi Usati, Tempo (min), Costo Post-Produzione (Manodopera), Costo Componenti Extra (viti, inserti), Costo Packaging.

## 4. LOGICA DI CALCOLO MARGINE LORDO
Per ogni Progetto, il sistema deve calcolare:
1. **Costo Produzione 3D**: (Materiale + Energia + Ammortamento Macchina).
2. **Quota Costi Fissi**: (Somma Costi Fissi Attivi / Ore Totali Stampate nel Mese) * Ore Progetto.
3. **Costi Accessori**: (Tempo Post-Produzione * Costo Orario Operatore) + Somma Componenti Extra + Packaging.
4. **Margine Lordo Assoluto**: Budget - (Costo 3D + Quota Fissi + Costi Accessori).
5. **Margine %**: (Margine Assoluto / Budget) * 100.

## 5. FUNZIONALITÀ RICHIESTE
- **Upload G-code**: Parser per estrarre tempo e grammi dai file .gcode (compatibile con PrusaSlicer/Bambu/Orca).
- **Dashboard Progetti**: Vista a "schede" per ogni progetto con indicatore di profitto (Verde se > 30%, Giallo 10-30%, Rosso < 10%).
- **Gestione Dinamica Spese**: Interfaccia per aggiungere/togliere costi fissi con un click (Toggle ON/OFF).
- **Scarico Magazzino**: Detrazione automatica dei grammi dalle bobine a stampa conclusa.
- **Reportistica**: Pulsante "Esporta Report Progetto" che generi un riepilogo testuale dei costi.

## 6. OUTPUT RICHIESTO
Fornisci il codice Python completo. Usa la libreria `streamlit` per la UI, `sqlite3` per i dati e `pandas` per i calcoli. Il codice deve essere modulare, commentato in italiano e pronto per essere eseguito con il comando `streamlit run main.py`.