import pandas as pd
from utils import load_settings

def calcola_margine_completo(progetto, logs, stampanti_list, magazzino_list, costi_fissi_list):
    """
    Calcola i costi e i margini per un progetto specifico.
    Tutti gli input sono liste di dizionari.
    """
    settings = load_settings()
    kwh_cost = float(settings.get("costo_kwh", 0.25))
    ore_mensili_farm = float(settings.get("ore_lavorative_mensili_farm", 160))
    costo_operatore = float(settings.get("costo_orario_post_prod", 15.0))

    budget = float(progetto.get('budget', 0.0))

    costo_3d_tot = 0.0
    costi_accessori_tot = 0.0
    ore_progetto_tot = 0.0

    for log in logs:
        stampante = next((s for s in stampanti_list if s['id'] == log['stampante_id']), None)
        magazzino = next((m for m in magazzino_list if m['id'] == log['magazzino_id']), None)

        if not stampante or not magazzino:
            continue

        tempo_h = float(log['tempo_minuti']) / 60.0
        ore_progetto_tot += tempo_h
        grammi = float(log['grammi_usati'])

        # Costo materiale
        costo_materiale = (float(magazzino['costo_kg']) / 1000.0) * grammi
        # Costo energia
        consumo_kw = float(stampante['consumo_w']) / 1000.0
        costo_energia = consumo_kw * tempo_h * kwh_cost
        # Ammortamento
        costo_ammortamento = float(stampante['ammortamento_orario']) * tempo_h

        costo_3d_tot += costo_materiale + costo_energia + costo_ammortamento

        costi_accessori_tot += float(log.get('costo_post_prod', 0))
        costi_accessori_tot += float(log.get('costo_extra', 0))
        costi_accessori_tot += float(log.get('costo_packaging', 0))

    # Costo progettazione
    ore_prog = float(progetto.get('ore_progettazione', 0.0))
    costo_prog = ore_prog * costo_operatore
    costo_extra_prog = float(progetto.get('costo_extra_progetto', 0.0))

    # Quota costi fissi
    tot_fissi = sum(float(cf['importo_mensile']) for cf in costi_fissi_list if cf['attivo'])
    quota_h = tot_fissi / ore_mensili_farm if ore_mensili_farm > 0 else 0
    quota_fissi = quota_h * ore_progetto_tot

    costo_totale = costo_3d_tot + quota_fissi + costi_accessori_tot + costo_prog + costo_extra_prog
    margine_assoluto = budget - costo_totale
    margine_perc = (margine_assoluto / budget * 100.0) if budget > 0 else 0.0

    return {
        "costo_3d": round(costo_3d_tot, 2),
        "quota_fissi": round(quota_fissi, 2),
        "costi_accessori": round(costi_accessori_tot, 2),
        "costo_progettazione": round(costo_prog + costo_extra_prog, 2),
        "costo_totale": round(costo_totale, 2),
        "margine_assoluto": round(margine_assoluto, 2),
        "margine_perc": round(margine_perc, 2),
        "ore_totali": round(ore_progetto_tot, 2)
    }


def calcola_riepilogo_finanziario(progetti, tutti_i_logs, stampanti_list, magazzino_list, costi_fissi_list):
    """
    Calcola i KPI aggregati per la Dashboard:
    - Entrate: somma budget dei progetti 'Terminato'
    - Uscite: somma costi reali di tutti i log
    - Margine: Entrate - Uscite
    """
    entrate = sum(float(p.get('budget', 0)) for p in progetti if p.get('stato') == 'Terminato')

    uscite = 0.0
    for p in progetti:
        logs = [l for l in tutti_i_logs if l['progetto_id'] == p['id']]
        calcoli = calcola_margine_completo(p, logs, stampanti_list, magazzino_list, costi_fissi_list)
        uscite += calcoli['costo_totale']

    margine = entrate - uscite

    return {
        "entrate": round(entrate, 2),
        "uscite": round(uscite, 2),
        "margine": round(margine, 2)
    }
