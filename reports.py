import os
from datetime import datetime

def generate_project_report(progetto, calcoli):
    """
    Genera un file di testo riepilogativo per un progetto e lo salva in /exports.
    """
    filename = f"Report_{progetto['nome'].replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    filepath = os.path.join('exports', filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(f"========================================\n")
        f.write(f" REPORT PROGETTO: {progetto['nome']}\n")
        f.write(f" Cliente: {progetto['cliente']}\n")
        f.write(f" Budget Vendita: € {float(progetto['budget']):.2f}\n")
        f.write(f"========================================\n\n")
        
        f.write(f"--- Riepilogo Costi ---\n")
        f.write(f" Costo Produzione 3D: € {calcoli['costo_3d']:.2f}\n")
        f.write(f" Quota Costi Fissi:   € {calcoli['quota_fissi']:.2f}\n")
        f.write(f" Costi Accessori:     € {calcoli['costi_accessori']:.2f}\n")
        f.write(f"----------------------------------------\n")
        f.write(f" COSTO TOTALE:        € {calcoli['costo_totale']:.2f}\n\n")
        
        f.write(f"--- Marginalità ---\n")
        f.write(f" MARGINE LORDO ASS:   € {calcoli['margine_assoluto']:.2f}\n")
        f.write(f" MARGINE %:           {calcoli['margine_perc']:.2f}%\n")
        f.write(f"========================================\n")
        
    return filepath
