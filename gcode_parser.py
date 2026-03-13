import re
import os

def parse_ore_minuti(valore_str):
    """
    Converte dal formato "Ore.Minuti" in minuti totali.
    Esempi: "2.30" = 150 min, "1.05" = 65 min, "0.45" = 45 min
    """
    try:
        valore_str = str(valore_str).strip().replace(',', '.')
        parti = valore_str.split('.')
        ore = int(parti[0]) if len(parti) > 0 else 0
        minuti = int(parti[1]) if len(parti) > 1 else 0
        return float(ore * 60 + minuti)
    except (ValueError, IndexError):
        return 0.0

def parse_gcode_file(filepath):
    """
    Legge un file .gcode e tenta di estrarre il tempo stimato (minuti)
    e i grammi di filamento usati.
    
    Compatibile con:
    - Bambu Studio (priorità)
    - OrcaSlicer
    - PrusaSlicer
    """
    time_min = 0.0
    grams = 0.0

    # ── Bambu Studio / OrcaSlicer patterns ──────────────────────────────────
    # Peso: "; total weight = 12.34 g"  o  "; filament_weight = 12.34"  o  "; total filament weight = 12.34 g"
    bambu_weight_patterns = [
        re.compile(r";\s*total weight\s*=\s*([0-9.]+)", re.IGNORECASE),
        re.compile(r";\s*filament_weight\s*=\s*([0-9.]+)", re.IGNORECASE),
        re.compile(r";\s*total filament weight\s*=\s*([0-9.]+)", re.IGNORECASE),
        re.compile(r";\s*total_weight\s*=\s*([0-9.]+)", re.IGNORECASE),
    ]
    # Tempo: "; estimated_print_time = 1234s" o "; total estimated time: 1h 23m"
    bambu_time_patterns = [
        re.compile(r";\s*estimated_print_time\s*=\s*([0-9]+)", re.IGNORECASE),       # in secondi
        re.compile(r";\s*printable_time_s\s*=\s*([0-9]+)", re.IGNORECASE),           # in secondi
        re.compile(r";\s*total print time:\s*([0-9]+)s", re.IGNORECASE),             # in secondi
        re.compile(r";\s*total estimated time:\s*(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?", re.IGNORECASE),
    ]

    # ── PrusaSlicer patterns ─────────────────────────────────────────────────
    prusa_weight_pattern = re.compile(r";\s*filament used \[g\]\s*=\s*([0-9.]+)", re.IGNORECASE)
    prusa_time_pattern = re.compile(
        r";\s*estimated printing time.*?=\s*(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?",
        re.IGNORECASE
    )

    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()

        # Leggi testa + coda (dove solitamente stanno i commenti di slicer)
        check_lines = lines[:600] + lines[-600:] if len(lines) > 1200 else lines

        for line in check_lines:
            # ─ Peso ─
            if grams == 0.0:
                for pat in bambu_weight_patterns:
                    m = pat.search(line)
                    if m:
                        grams = float(m.group(1))
                        break
                if grams == 0.0:
                    m = prusa_weight_pattern.search(line)
                    if m:
                        grams = float(m.group(1))

            # ─ Tempo ─
            if time_min == 0.0:
                # Pattern secondi semplice
                for pat in bambu_time_patterns[:3]:
                    m = pat.search(line)
                    if m:
                        time_min = float(m.group(1)) / 60.0
                        break

                # Pattern hh/mm Bambu
                if time_min == 0.0:
                    m = bambu_time_patterns[3].search(line)
                    if m and any(m.groups()):
                        h = int(m.group(1) or 0)
                        mn = int(m.group(2) or 0)
                        s = int(m.group(3) or 0)
                        time_min = h * 60 + mn + s / 60.0

                # Pattern PrusaSlicer
                if time_min == 0.0:
                    m = prusa_time_pattern.search(line)
                    if m and any(m.groups()):
                        d = int(m.group(1) or 0)
                        h = int(m.group(2) or 0)
                        mn = int(m.group(3) or 0)
                        s = int(m.group(4) or 0)
                        time_min = (d * 24 * 60) + (h * 60) + mn + (s / 60.0)

    except Exception as e:
        print(f"[GCode Parser] Errore lettura file: {e}")

    return {
        "time_min": round(time_min, 2),
        "grams": round(grams, 2)
    }
