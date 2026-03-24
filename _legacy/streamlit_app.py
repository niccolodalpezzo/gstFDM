import streamlit as st
import pandas as pd
import os
from utils import setup_environment, load_settings, save_settings
import database as db
from gcode_parser import parse_gcode_file, parse_ore_minuti
from calculations import calcola_margine_completo, calcola_riepilogo_finanziario
from reports import generate_project_report

# ─── Config e Setup ──────────────────────────────────────────────────────────
st.set_page_config(page_title="Arena Plast — PrintFarm", layout="wide", page_icon="🖨️")
setup_environment()

# ─── V2 Modern & Customizable CSS ───────────────────────────────────────────
def inject_custom_css(settings):
    theme_mode = settings.get("theme_mode", "Scuro")
    accent_color = settings.get("theme_accent", "#6C63FF")
    font_family = settings.get("theme_font", "Inter")

    if theme_mode == "Scuro":
        bg_color = "#13131A"
        app_bg = "linear-gradient(135deg, #0a0a0f 0%, #15151e 100%)"
        text_color = "#E0E0E0"
        card_bg = "rgba(25, 25, 32, 0.6)"
        card_border = "rgba(255, 255, 255, 0.05)"
        sidebar_bg = "rgba(15, 15, 20, 0.85)"
    else:
        bg_color = "#F8F9FA"
        app_bg = "linear-gradient(135deg, #f0f2f5 0%, #ffffff 100%)"
        text_color = "#111111"
        card_bg = "rgba(255, 255, 255, 0.8)"
        card_border = "rgba(0, 0, 0, 0.05)"
        sidebar_bg = "rgba(250, 250, 252, 0.85)"

    st.markdown(f"""
    <style>
    @import url('https://fonts.googleapis.com/css2?family={font_family.replace(' ', '+')}:wght@300;400;500;600;700&display=swap');
    html, body, [class*="st-"] {{
        font-family: '{font_family}', system-ui, sans-serif !important;
        color: {{text_color}} !important;
    }}
    .stApp {{
        background: {{app_bg}} !important;
        background-attachment: fixed !important;
    }}
    .stSidebar {{
        background-color: {{sidebar_bg}} !important;
        backdrop-filter: blur(12px) !important;
        border-right: 1px solid {{card_border}} !important;
    }}
    h1, h2, h3, h4 {{ color: {{text_color}} !important; font-weight: 700; }}
    
    /* Buttons */
    .stButton>button {{
        border-radius: 8px !important;
        border: 1px solid {{accent_color}}40 !important;
        background: linear-gradient(180deg, {{card_bg}} 0%, transparent 100%) !important;
        color: {{text_color}} !important;
        font-weight: 600 !important;
        transition: all 0.2s ease !important;
    }}
    .stButton>button:hover {{
        border-color: {{accent_color}} !important;
        box-shadow: 0 4px 12px {{accent_color}}30 !important;
        transform: translateY(-2px) !important;
        color: {{accent_color}} !important;
    }}
    .stButton>button[kind="primary"] {{
        background: {{accent_color}} !important;
        border: none !important;
        color: #ffffff !important;
    }}
    .stButton>button[kind="primary"]:hover {{
        box-shadow: 0 4px 15px {{accent_color}}60 !important;
        transform: translateY(-2px) !important;
        color: #ffffff !important;
    }}

    /* Cards */
    [data-testid="stVerticalBlock"] > [style*="flex-direction: column"] {{
        background-color: {{card_bg}};
        backdrop-filter: blur(10px);
        border: 1px solid {{card_border}};
        border-radius: 12px;
        padding: 1.25rem;
        box-shadow: 0 8px 32px rgba(0,0,0,0.05);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }}
    div[data-testid="stVerticalBlockBorderWrapper"] {{
        border-radius: 12px !important;
    }}
    
    /* Metrics */
    div[data-testid="stMetricValue"] {{ 
        color: {{accent_color}} !important; 
        font-size: 2.2rem !important; 
        font-weight: 700 !important;
    }}
    div[data-testid="stMetricLabel"] {{ 
        font-weight: 600 !important; 
        font-size: 0.85rem !important; 
        color: {{text_color}} !important; 
        opacity: 0.7;
        text-transform: uppercase; 
        letter-spacing: 0.5px;
    }}
    
    /* Inputs */
    .stTextInput input, .stNumberInput input, .stSelectbox select {{
        border-radius: 6px !important;
        border: 1px solid {{card_border}} !important;
        background-color: {{card_bg}} !important;
        color: {{text_color}} !important;
    }}
    .stTextInput input:focus, .stNumberInput input:focus {{
        border-color: {{accent_color}} !important;
        box-shadow: 0 0 0 1px {{accent_color}} !important;
    }}
    .streamlit-expanderHeader {{ font-weight: 600 !important; color: {{text_color}} !important; }}
    </style>
    """.replace("{{text_color}}", text_color).replace("{{app_bg}}", app_bg).replace("{{sidebar_bg}}", sidebar_bg).replace("{{card_border}}", card_border).replace("{{accent_color}}", accent_color).replace("{{card_bg}}", card_bg), unsafe_allow_html=True)

app_settings = load_settings()
inject_custom_css(app_settings)


# ─── Helpers Caricamento Dati ────────────────────────────────────────────────

def _load_all_data():
    """Carica tutti i dati dal DB in dizionari Python listati."""
    projs = db.get_progetti().to_dict('records') if not db.get_progetti().empty else []
    stamps = db.get_stampanti().to_dict('records') if not db.get_stampanti().empty else []
    mag = db.get_magazzino().to_dict('records') if not db.get_magazzino().empty else []
    cf = db.get_costi_fissi().to_dict('records') if not db.get_costi_fissi().empty else []
    logs = db.get_log_stampe().to_dict('records') if not db.get_log_stampe().empty else []
    return projs, stamps, mag, cf, logs

def _margine_emoji(perc):
    if perc > 30: return "🟩"
    if perc >= 10: return "🟨"
    return "🟥"


# ════════════════════════════════════════════════════════════════════════════
# 1. DASHBOARD
# ════════════════════════════════════════════════════════════════════════════

def render_dashboard():
    st.title("In sintesi")
    st.markdown("Panoramica finanziaria e stato avanzamento commesse.")
    st.divider()

    progetti, stampanti, magazzino, costi_fissi, all_logs = _load_all_data()

    if not progetti:
        st.info("Nessun progetto trovato. Inizia creando una commessa da 'Progetti'.")
        return

    riepilogo = calcola_riepilogo_finanziario(progetti, all_logs, stampanti, magazzino, costi_fissi)
    
    # KPI 
    c1, c2, c3 = st.columns(3)
    with c1: st.metric(label="Entrate (Progetti Terminati)", value=f"€ {riepilogo['entrate']:,.2f}")
    with c2: st.metric(label="Uscite (Costi Totali)", value=f"€ {riepilogo['uscite']:,.2f}")
    with c3: 
        m = riepilogo['margine']
        st.metric(label="Margine Netto", value=f"€ {m:,.2f}", delta="In Attivo" if m >= 0 else "In Passivo", delta_color="normal" if m>=0 else "inverse")

    st.divider()
    st.subheader("Bacheca Commesse")

    # Meno form per riga, design più a tabella/cards per ridurre gli errori
    cols = st.columns(3)
    for i, progetto in enumerate(progetti):
        logs = [l for l in all_logs if l['progetto_id'] == progetto['id']]
        calcoli = calcola_margine_completo(progetto, logs, stampanti, magazzino, costi_fissi)
        mp = calcoli['margine_perc']
        emoji = _margine_emoji(mp)

        with cols[i % 3]:
            # Usa una card standard Streamlit
            with st.container(border=True):
                st.markdown(f"**{progetto['nome']}**")
                st.caption(f"Cliente: {progetto.get('cliente','—')} | Stato: **{progetto.get('stato','—')}**")
                c_a, c_b = st.columns(2)
                c_a.metric("Budget", f"€ {float(progetto['budget']):.2f}")
                c_b.metric("Costi", f"€ {calcoli['costo_totale']:.2f}")
                st.markdown(f"{emoji} Margine: **{mp:.1f}%** (€ {calcoli['margine_assoluto']:.2f})")
                
                # Report button pulito
                if st.button("Genera Report Documentale", key=f"rep_{progetto['id']}", use_container_width=True):
                    path = generate_project_report(progetto, calcoli)
                    st.success("✔ Report PRONTO")
                    with open(path, "r") as f:
                        st.download_button("Scarica TXT", f, file_name=os.path.basename(path), key=f"dl_{progetto['id']}", use_container_width=True)


# ════════════════════════════════════════════════════════════════════════════
# 2. PROGETTI
# ════════════════════════════════════════════════════════════════════════════

STATI_PROGETTO = ['Progettazione', 'Prototipazione', 'Produzione', 'Terminato']

def render_progetti():
    st.title("Gestione Progetti")
    st.divider()

    # Nuova impostazione: Form unificato sopra, edit/delete unificato sotto
    with st.expander("➕ Nuovo Progetto", expanded=False):
        st.write("Inserisci i dettagli del nuovo progetto:")
        with st.form("form_nuovo_prog", clear_on_submit=True):
            c1, c2 = st.columns(2)
            nome = c1.text_input("Nome Progetto *")
            cliente = c2.text_input("Cliente")
            
            c3, c4, c5 = st.columns(3)
            budget = c3.number_input("Budget € (Prezzo Vendita)", min_value=0.0, format="%.2f")
            stato = c4.selectbox("Stato Iniziale", STATI_PROGETTO)
            quantita = c5.number_input("Quantità da produrre", min_value=1, value=1, step=1)
            
            c6, c7 = st.columns(2)
            ore_prog = c6.number_input("Ore progettazione (h)", min_value=0.0, format="%.1f")
            costo_extra = c7.number_input("Costi extra una-tantum (packaging, comp. fisici) €", min_value=0.0, format="%.2f")
            
            if st.form_submit_button("Aggiungi Progetto") and nome:
                db.add_progetto(nome, cliente, budget, stato, quantita, ore_prog, costo_extra)
                st.success("✔ Progetto aggiunto con successo!")
                st.rerun()

    progetti_df = db.get_progetti()
    if progetti_df.empty:
        st.info("Nessuna commessa presente. Aggiungine una tramite il form qui sopra.")
        return

    st.subheader("Commesse a Sistema")
    # Tabella read-only visuale pulita
    show_df = progetti_df[['id','nome','cliente','stato','budget','quantita_da_produrre']].copy()
    st.dataframe(show_df, use_container_width=True, hide_index=True)

    st.divider()
    st.subheader("Modifica / Elimina")
    # Invece di creare un expander per OGNI riga (causa bug layout), usiamo un selettore unificato.
    opz_prog = {p['id']: f"[{p['id']}] {p['nome']} - {p['stato']}" for _, p in progetti_df.iterrows()}
    scelta_id = st.selectbox("Seleziona Progetto da modificare o eliminare:", list(opz_prog.keys()), format_func=lambda x: opz_prog[x])
    
    if scelta_id:
        p = progetti_df[progetti_df['id'] == scelta_id].iloc[0].to_dict()
        with st.form(f"edit_prog_unificato"):
            st.markdown(f"**Stai modificando: {p['nome']}**")
            c1, c2 = st.columns(2)
            nome_e = c1.text_input("Nome", value=p['nome'])
            cliente_e = c2.text_input("Cliente", value=p.get('cliente',''))
            
            c3, c4, c5 = st.columns(3)
            budget_e = c3.number_input("Budget €", value=float(p['budget']), format="%.2f")
            stato_idx = STATI_PROGETTO.index(p.get('stato')) if p.get('stato') in STATI_PROGETTO else 0
            stato_e = c4.selectbox("Stato", STATI_PROGETTO, index=stato_idx)
            qty_e = c5.number_input("Quantità", value=int(p.get('quantita_da_produrre',1)), min_value=1, step=1)
            
            c6, c7 = st.columns(2)
            ore_e = c6.number_input("Ore prog.", value=float(p.get('ore_progettazione',0.0)), format="%.1f")
            extra_e = c7.number_input("Costi extra €", value=float(p.get('costo_extra_progetto',0.0)), format="%.2f")
            
            col_save, col_del = st.columns([1,1])
            if col_save.form_submit_button("Salva Modifiche", type="primary"):
                db.update_progetto(p['id'], nome_e, cliente_e, budget_e, stato_e, qty_e, ore_e, extra_e)
                st.success("✔ Modifica salvata.")
                st.rerun()
            if col_del.form_submit_button("Elimina Definitivamente Progetto"):
                db.delete_progetto(p['id'])
                st.rerun()


# ════════════════════════════════════════════════════════════════════════════
# 3. MAGAZZINO BOBINE
# ════════════════════════════════════════════════════════════════════════════

def render_magazzino():
    st.title("Magazzino Bobine")
    st.divider()

    with st.expander("➕ Inserisci Bobina a stock", expanded=False):
        with st.form("form_nuova_bobina", clear_on_submit=True):
            c1, c2, c3, c4 = st.columns(4)
            marca = c1.text_input("Marca (es. Bambu)")
            materiale = c2.text_input("Materiale (es. PETG)")
            colore = c3.text_input("Colore")
            costo_kg = c4.number_input("Costo/kg €", min_value=0.00, format="%.2f")
            
            c5, c6, c7 = st.columns(3)
            grammi = c5.number_input("Grammi iniziali a bobina", min_value=0.0, value=1000.0)
            stato = c6.selectbox("Stato iniziale", ["Nuova", "Usata"])
            quantita = c7.number_input("Quantità (n° bobine identiche)", min_value=1, value=1, step=1)
            
            if st.form_submit_button("Aggiungi a Inventario"):
                if materiale and colore:
                    qty = quantita if stato == 'Nuova' else 0
                    db.add_magazzino(marca, materiale, colore, costo_kg, grammi, stato, qty)
                    st.success("✔ Aggiunta.")
                    st.rerun()

    mag_df = db.get_magazzino()
    if mag_df.empty:
        st.info("Nessuna occorrenza in magazzino.")
        return

    st.subheader("Stato Inventario")
    
    tab1, tab2, tab3 = st.tabs(["📦 NUOVE (A stock)", "🧵 USATE (Attive sui progetti)", "♻️ TERMINATE"])
    
    with tab1:
        nuove = mag_df[mag_df['stato'] == 'Nuova']
        if nuove.empty: 
            st.write("Nessuna bobina imballata.")
        else:
            for _, r in nuove.iterrows():
                with st.container(border=True):
                    cols = st.columns([4, 2, 2, 2])
                    cols[0].markdown(f"**{r.get('marca','')} {r['materiale']}** - {r['colore']}")
                    cols[1].write(f"Stock: **{r.get('quantita_stock',1)} pz**")
                    cols[2].write(f"Costo: €{r['costo_kg']:.2f}/kg")
                    if cols[3].button("▶ Prelevala e Attivala", key=f"attiva_{r['id']}", use_container_width=True):
                        codice = db.attiva_bobina_nuova(r['id'])
                        st.success(f"Bobina in uso! Usa questo Codice Univoco: {codice}")
                        st.rerun()

    with tab2:
        usate = mag_df[mag_df['stato'] == 'Usata']
        if usate.empty:
            st.write("Nessuna bobina in uso.")
        else:
            for _, r in usate.iterrows():
                with st.container(border=True):
                    cols = st.columns([4, 2, 2, 2])
                    cols[0].markdown(f"**{r.get('marca','')} {r['materiale']}** - {r['colore']}")
                    cols[1].markdown(f"Codice: **`{r.get('codice_univoco','—')}`**")
                    cols[2].write(f"Residuo: {r['grammi_residui']:.0f}g")
                    if cols[3].button("Elimina", key=f"del_usata_{r['id']}", use_container_width=True):
                        db.delete_magazzino(r['id'])
                        st.rerun()

    with tab3:
        terminate = mag_df[mag_df['stato'] == 'Terminata']
        if terminate.empty:
            st.write("Nessuna bobina tra i rifiuti.")
        else:
            for _, r in terminate.iterrows():
                cols = st.columns([5, 1])
                cols[0].write(f"{r.get('marca','')} {r['materiale']} - {r['colore']} (Esaurita)")
                if cols[1].button("Rimuovi dal DB", key=f"del_term_{r['id']}", use_container_width=True):
                    db.delete_magazzino(r['id'])
                    st.rerun()


# ════════════════════════════════════════════════════════════════════════════
# 4. STAMPANTI
# ════════════════════════════════════════════════════════════════════════════

def render_stampanti():
    st.title("Flotta Stampanti")
    st.divider()

    with st.expander("➕ Registra Nuova Macchina", expanded=False):
        with st.form("form_nuova_stamp", clear_on_submit=True):
            c1, c2, c3 = st.columns(3)
            marca = c1.text_input("Marca (es. Bambu Lab)")
            modello = c2.text_input("Modello *")
            ugello = c3.number_input("Ø Ugello (mm)", value=0.4, format="%.2f")
            
            c4, c5, c6 = st.columns(3)
            consumo = c4.number_input("Assorbimento (W)", min_value=0.0, value=150.0)
            costo = c5.number_input("Costo d'Acquisto €", min_value=0.0, format="%.2f")
            ammort = c6.number_input("Ammortamento €/h stimato", min_value=0.0, value=0.10, format="%.3f")
            
            if st.form_submit_button("Aggiungi Stampante") and modello:
                db.add_stampante(marca, modello, ugello, consumo, costo, ammort)
                st.success("✔ Macchina inserita")
                st.rerun()

    stamps_df = db.get_stampanti()
    if stamps_df.empty:
        st.info("Nessuna stampante rilevata.")
        return

    st.subheader("Macchine a Sistema")
    st.dataframe(stamps_df[['id','marca','modello','diametro_ugello','consumo_w']], use_container_width=True, hide_index=True)

    st.divider()
    st.subheader("Modifica / Elimina Macchina")
    opz_stamp = {s['id']: f"{s.get('marca','')} {s['modello']}" for _, s in stamps_df.iterrows()}
    scelta_s_id = st.selectbox("Seleziona Stampante:", list(opz_stamp.keys()), format_func=lambda x: opz_stamp[x])

    if scelta_s_id:
        s = stamps_df[stamps_df['id'] == scelta_s_id].iloc[0].to_dict()
        with st.form(f"edit_stamp_unificato"):
            c1, c2, c3 = st.columns(3)
            marca_e = c1.text_input("Marca", value=s.get('marca',''))
            modello_e = c2.text_input("Modello", value=s['modello'])
            ugello_e = c3.number_input("Ø Ugello", value=float(s.get('diametro_ugello',0.4)), format="%.2f")
            
            c4, c5, c6 = st.columns(3)
            consumo_e = c4.number_input("Consumo (W)", value=float(s['consumo_w']))
            costo_e = c5.number_input("Costo Acquisto €", value=float(s['costo_acquisto']), format="%.2f")
            ammort_e = c6.number_input("Ammortamento €/h", value=float(s['ammortamento_orario']), format="%.3f")
            
            col_save, col_del = st.columns([1,1])
            if col_save.form_submit_button("Salva Modifiche", type="primary"):
                db.update_stampante(s['id'], marca_e, modello_e, ugello_e, consumo_e, costo_e, ammort_e)
                st.success("✔ Aggiornata")
                st.rerun()
            if col_del.form_submit_button("Elimina Macchina"):
                db.delete_stampante(s['id'])
                st.rerun()


# ════════════════════════════════════════════════════════════════════════════
# 5. LOG STAMPE
# ════════════════════════════════════════════════════════════════════════════

def render_log_stampe():
    st.title("Registrazione Print Log")
    st.markdown("Imputa i dati per calcolare il costo effettivo pezzo.")
    st.divider()

    proj_df = db.get_progetti()
    stamp_df = db.get_stampanti()
    mag_df = db.get_magazzino()

    usate = mag_df[mag_df['stato'] == 'Usata'] if not mag_df.empty else None

    if proj_df.empty or stamp_df.empty:
        st.warning("⚠️ Manca l'anagrafica di base: aggiungi almeno un Progetto e una Stampante.")
        return
    if usate is None or usate.empty:
        st.warning("⚠️ Non ci sono bobine in stato 'Usata'. Vai a Magazzino e Attiva una bobina Nuova.")
        return

    # Mantenimento info parseate nel session_state
    if 'gcv_time' not in st.session_state: st.session_state.gcv_time = 0.0
    if 'gcv_grams' not in st.session_state: st.session_state.gcv_grams = 0.0

    st.subheader("1. Lettura G-Code (Opzionale)")
    uploaded = st.file_uploader("Trascina qui il .gcode per l'auto-compilazione", type=['gcode'])
    if uploaded:
        fpath = os.path.join('gcode_vault', uploaded.name)
        with open(fpath, "wb") as f:
            f.write(uploaded.getbuffer())
        parsed = parse_gcode_file(fpath)
        if parsed['time_min'] > 0 or parsed['grams'] > 0:
            st.session_state.gcv_time = parsed['time_min']
            st.session_state.gcv_grams = parsed['grams']
            st.success(f"✔ File scansionato: {parsed['time_min']:.0f} min | {parsed['grams']}g")
        else:
            st.warning("Impossibile estrarre metadati, compilare a mano.")

    st.subheader("2. Dati di Stampa")
    with st.form("form_log_stampa", clear_on_submit=False):
        c1, c2 = st.columns(2)
        opz_prog = {p['id']: p['nome'] for p in proj_df.to_dict('records')}
        opz_stamp = {s['id']: f"{s.get('marca','')} {s['modello']}" for s in stamp_df.to_dict('records')}
        prog_sel = c1.selectbox("Progetto", list(opz_prog.keys()), format_func=lambda x: opz_prog[x])
        stamp_sel = c2.selectbox("Stampante Utilizzata", list(opz_stamp.keys()), format_func=lambda x: opz_stamp[x])

        st.markdown("---")
        c_bob, c_g, c_t = st.columns([2, 1, 1])
        
        # Selezione Bobina da quelle usate/attive
        opz_bobbins = {b['codice_univoco']: f"[{b['codice_univoco']}] {b.get('marca','')} {b['materiale']} {b['colore']} ({b['grammi_residui']:.0f}g)" for _, b in usate.iterrows()}
        codice_input = c_bob.selectbox("Bobina in Uso", list(opz_bobbins.keys()), format_func=lambda x: opz_bobbins[x])
        
        grammi = c_g.number_input("Filamento (g)", min_value=0.0, value=float(st.session_state.gcv_grams))
        # mostriamo le ore parseate o quelle di default
        def_t = f"{st.session_state.gcv_time / 60:.2f}".replace('.', ',') if st.session_state.gcv_time > 0 else "0,00"
        tempo_str = c_t.text_input("Tempo (Ore.Minuti)", value=def_t.replace(',','.'))

        st.markdown("---")
        c_post, c_ext, c_pack = st.columns(3)
        post_prod = c_post.number_input("Manodopera post-prod. €", min_value=0.0, format="%.2f")
        costo_extra = c_ext.number_input("Inserti, Elettricità, etc €", min_value=0.0, format="%.2f")
        packaging = c_pack.number_input("Costo Packaging €", min_value=0.0, format="%.2f")

        if st.form_submit_button("Conferma Log Stampa", type="primary"):
            tempo_min = parse_ore_minuti(tempo_str)
            bobina = db.get_bobina_by_codice(codice_input)
            
            if not codice_input:
                st.error("❌ Nessuna bobina selezionata.")
            elif not bobina:
                st.error("❌ Codice Bobina inesistente o bobina terminata.")
            elif grammi <= 0 or tempo_min <= 0:
                st.error("❌ Attenzione: Grammi e Tempo devono essere maggiori di zero.")
            else:
                db.add_log_stampa(prog_sel, stamp_sel, bobina['id'], grammi, tempo_min, post_prod, costo_extra, packaging)
                db.update_magazzino_grammi(bobina['id'], grammi)
                
                # Resetto cache
                st.session_state.gcv_grams = 0.0
                st.session_state.gcv_time = 0.0
                st.success(f"✔ Stampa archiviata! Bobina {codice_input} scalata correttamente.")
                # Non uso st.rerun automatico per permettere di leggere il successo
                

# ════════════════════════════════════════════════════════════════════════════
# 6. SPESE FISSE
# ════════════════════════════════════════════════════════════════════════════

def render_spese_fisse():
    st.title("Spese Fisse Generiche")
    st.divider()

    with st.form("form_nuova_spesa", clear_on_submit=True):
        c1, c2, c3 = st.columns([3, 1, 1])
        nome = c1.text_input("Descrizione Spesa (Luce Fissa, Affitto)")
        importo = c2.number_input("€ Mese", min_value=0.0, format="%.2f")
        if c3.form_submit_button("Inserisci Spesa"):
            if nome:
                db.add_costo_fisso(nome, importo, True)
                st.rerun()

    cf_df = db.get_costi_fissi()
    if cf_df.empty:
        st.info("Nessun costo fisso presente.")
        return

    st.subheader("Lista Oneri Mensili")
    totale = 0.0
    for _, r in cf_df.iterrows():
        is_active = bool(r['attivo'])
        if is_active: totale += float(r['importo_mensile'])
        
        with st.container(border=True):
            cols = st.columns([4, 2, 2, 1])
            cols[0].write(f"{'🔵' if is_active else '⚪'} **{r['nome']}**")
            cols[1].write(f"€ {float(r['importo_mensile']):.2f}")
            if cols[2].button("ON/OFF Attivazione", key=f"tog_{r['id']}", use_container_width=True):
                db.toggle_costo_fisso(r['id'], not is_active)
                st.rerun()
            if cols[3].button("🗑️", key=f"del_{r['id']}", use_container_width=True):
                db.delete_costo_fisso(r['id'])
                st.rerun()

    st.markdown(f"#### Totale ripartizione attiva: **€ {totale:.2f} / mese**")


# ════════════════════════════════════════════════════════════════════════════
# 7. IMPOSTAZIONI
# ════════════════════════════════════════════════════════════════════════════

def render_impostazioni():
    st.title("Impostazioni Farm")
    st.markdown("Configura i driver di costo globale dell'officina.")
    st.divider()
    
    settings = load_settings()
    with st.form("form_settings"):
        c1, c2 = st.columns(2)
        kwh = c1.number_input("Costo al kWh dell'energia (€)", value=float(settings.get("costo_kwh", 0.25)), format="%.3f")
        op_h = c2.number_input("Costo Orario Operatore Fisso (€/h)", value=float(settings.get("costo_orario_post_prod", 15.0)), format="%.2f")
        ore_farm = st.number_input("Stima ore lavorative mensili Farm completa (per spalmare i costi fissi)", value=float(settings.get("ore_lavorative_mensili_farm", 160.0)))
        
        if st.form_submit_button("Salva Configurazioni", type="primary"):
            settings.update({"costo_kwh": kwh, "costo_orario_post_prod": op_h, "ore_lavorative_mensili_farm": ore_farm})
            save_settings(settings)
            st.success("✔ Aggiornato con successo nel file `settings.json`")




# ════════════════════════════════════════════════════════════════════════════
# 8. PERSONALIZZAZIONE ASPETTO
# ════════════════════════════════════════════════════════════════════════════

DEFAULT_THEME = {
    "theme_mode": "Scuro",
    "theme_accent": "#6C63FF",
    "theme_font": "Inter"
}

FONT_OPTIONS = ["Inter", "Outfit", "Poppins", "Roboto", "JetBrains Mono"]
MODE_OPTIONS = ["Scuro", "Chiaro"]

def render_personalizzazione():
    st.title("🎨 Personalizzazione Aspetto")
    st.markdown("Configura il tema visivo dell'applicazione: colori, font e modalità.")
    st.divider()

    settings = load_settings()

    # ── Anteprima Colore Corrente ──
    accent = settings.get("theme_accent", "#6C63FF")
    mode = settings.get("theme_mode", "Scuro")
    font = settings.get("theme_font", "Inter")

    st.subheader("Tema Attuale")
    col_p1, col_p2, col_p3 = st.columns(3)
    with col_p1:
        with st.container(border=True):
            st.markdown(f"**Modalità**")
            st.markdown(f"{'🌙' if mode == 'Scuro' else '☀️'} {mode}")
    with col_p2:
        with st.container(border=True):
            st.markdown(f"**Colore Accent**")
            st.markdown(f'<div style="width:40px;height:40px;border-radius:8px;background:{accent};border:2px solid rgba(255,255,255,0.15);"></div>', unsafe_allow_html=True)
            st.caption(accent)
    with col_p3:
        with st.container(border=True):
            st.markdown(f"**Font**")
            st.markdown(f"📝 {font}")

    st.divider()
    st.subheader("Modifica Tema")

    with st.form("form_theme"):
        c1, c2, c3 = st.columns(3)
        font_idx = FONT_OPTIONS.index(font) if font in FONT_OPTIONS else 0
        font_scelto = c1.selectbox("Font Family", FONT_OPTIONS, index=font_idx)
        colore_scelto = c2.color_picker("Colore Accent", accent)
        modo_idx = MODE_OPTIONS.index(mode) if mode in MODE_OPTIONS else 0
        modo_scelto = c3.selectbox("Modalità Tema", MODE_OPTIONS, index=modo_idx)

        col_apply, col_reset = st.columns([2, 1])
        applied = col_apply.form_submit_button("✅ Applica Tema", type="primary", use_container_width=True)
        reset = col_reset.form_submit_button("🔄 Ripristina Default", use_container_width=True)

        if applied:
            settings.update({
                "theme_font": font_scelto,
                "theme_accent": colore_scelto,
                "theme_mode": modo_scelto
            })
            save_settings(settings)
            st.rerun()

        if reset:
            settings.update(DEFAULT_THEME)
            save_settings(settings)
            st.rerun()


# ════════════════════════════════════════════════════════════════════════════
# NAVIGATORE LATERALE
# ════════════════════════════════════════════════════════════════════════════

SECTIONS = {
    "Dashboard Generale": render_dashboard,
    "Print Log & Scansione": render_log_stampe,
    "Gestione Progetti": render_progetti,
    "Magazzino Filamenti": render_magazzino,
    "Flotta Stampanti": render_stampanti,
    "Spese Correnti": render_spese_fisse,
    "Impostazioni Setup": render_impostazioni,
    "Personalizzazione": render_personalizzazione,
}

with st.sidebar:
    st.title("ARENA PLAST")
    st.caption("Industrial PrintFarm Manager")
    st.markdown("<br>", unsafe_allow_html=True)
    selection = st.radio("Sezioni:", list(SECTIONS.keys()), label_visibility="collapsed")

# Esegui la sezione scelta
SECTIONS[selection]()
